import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
  Weight,
  XCircle,
} from "lucide-react";

import api from "../../services/api";

type BookingStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "arriving_at_pickup"
  | "arrived_at_pickup"
  | "picked_up"
  | "in_transit"
  | "arrived_at_drop"
  | "delivered"
  | "cancelled";

interface BookingParty {
  _id?: string;
  name: string;
  phone?: string;
}

interface Booking {
  _id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string | null;
  cancellationReason?: string;
  customer: BookingParty | string | null;
  driver: BookingParty | string | null;
  vehicle:
    | {
        _id?: string;
        name: string;
        capacityKg?: number;
      }
    | string
    | null;
  pickup: { address: string };
  drop: { address: string };
  package: {
    description: string;
    weightKg: number;
    specialInstructions?: string;
  };
  route: {
    distanceKm: number;
    durationMinutes: number;
  };
  fare: {
    currency?: string;
    estimatedFare: number;
    finalFare: number | null;
  };
}

const deliverySteps: BookingStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "arriving_at_pickup",
  "arrived_at_pickup",
  "picked_up",
  "in_transit",
  "arrived_at_drop",
  "delivered",
];

const stepDescriptions: Record<string, string> = {
  pending: "Your booking is awaiting driver assignment.",
  assigned: "A driver has been assigned to your delivery.",
  accepted: "The driver has accepted the delivery job.",
  arriving_at_pickup: "The driver is travelling to the pickup location.",
  arrived_at_pickup: "The driver has arrived at the pickup location.",
  picked_up: "Your package has been picked up.",
  in_transit: "Your package is on its way to the destination.",
  arrived_at_drop: "The driver has arrived at the destination.",
  delivered: "Your delivery has been completed.",
  cancelled: "This booking has been cancelled.",
};

const formatStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 429) return "Too many requests. Automatic refresh is paused. Wait a moment, then retry manually.";
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view this booking.";
    if (status === 404) return "This booking was not found. Check the booking link and try again.";
    return error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot connect to LogiGo API. Check that the backend is running." : "Unable to load booking details.");
  }
  return error instanceof Error ? error.message : "Unable to load booking details.";
}

function StatusPill({ status }: { status: BookingStatus }) {
  const colorClass =
    status === "delivered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "cancelled"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "pending"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatStatus(status)}
    </span>
  );
}

function BookingDetails() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [pollingPaused, setPollingPaused] = useState(false);
  const requestInProgress = useRef(false);
  const bookingRef = useRef<Booking | null>(null);

  // Stable callback: it depends on the booking ID only, not booking state.
  // This prevents a state update from recreating the polling callback and
  // accidentally triggering a rapid repeat-request loop.
  const loadBooking = useCallback(async (silent = false) => {
    if (!id) {
      setError("Booking ID is missing.");
      setLoading(false);
      return;
    }
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError("");
    }

    try {
      const response = await api.get(`/bookings/${id}`);
      if (!response.data.success || !response.data.booking) {
        throw new Error(response.data.message || "Unable to load booking details.");
      }

      const loadedBooking = response.data.booking as Booking;
      bookingRef.current = loadedBooking;
      setBooking(loadedBooking);
      setLastUpdated(new Date().toISOString());
      setSyncError("");
      setError("");
      setPollingPaused(false);
    } catch (requestError: unknown) {
      const message = getErrorMessage(requestError);
      if (silent && bookingRef.current !== null) {
        setSyncError(message);
      } else {
        setError(message);
      }
      if (isAxiosError(requestError) && requestError.response?.status === 429) {
        setPollingPaused(true);
      }
    } finally {
      requestInProgress.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBooking(false);
  }, [loadBooking]);

  // Poll only while a booking is active. Pause automatic requests after a 429
  // so the page never continues hammering the rate limiter.
  useEffect(() => {
    if (!booking || booking.status === "delivered" || booking.status === "cancelled" || pollingPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!requestInProgress.current) void loadBooking(true);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [booking?.status, pollingPaused, loadBooking]);

  const isCancelled = booking?.status === "cancelled";
  const currentStepIndex = booking ? deliverySteps.indexOf(booking.status) : -1;
  const progress = currentStepIndex < 0 ? 0 : (currentStepIndex / (deliverySteps.length - 1)) * 100;
  const driver = booking && typeof booking.driver === "object" ? booking.driver : null;
  const vehicle = booking && typeof booking.vehicle === "object" ? booking.vehicle : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-5 py-10 text-slate-900">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <RefreshCw className="h-7 w-7 animate-spin" />
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-600">Loading delivery tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <Package className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">Booking unavailable</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">{error || "Booking details could not be loaded."}</p>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadBooking(false)}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Try again
          </button>
          <Link to="/customer/orders" className="mt-4 block text-sm font-semibold text-slate-500 hover:text-orange-600">Back to My Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-700 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Your delivery journey
            </div>
            <h1 className="mt-4 break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">{booking.bookingCode}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Track your booking progress from driver assignment through to delivery completion.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusPill status={booking.status} />
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(booking.createdAt)}</span>
            </div>
          </div>
          <button type="button" onClick={() => void loadBooking(true)} disabled={refreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh status
          </button>
        </section>

        {syncError && (
          <div role="status" className="mt-5 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{syncError}</span>
            {pollingPaused && <span className="font-bold">Automatic refresh paused</span>}
          </div>
        )}

        {/* Current status hero */}
        <section className={`relative mt-7 overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-8 ${isCancelled ? "border-red-200 bg-white" : "border-orange-100 bg-white"}`}>
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-orange-50" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isCancelled ? "bg-red-50 text-red-600" : booking.status === "delivered" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                {isCancelled ? <XCircle className="h-7 w-7" /> : booking.status === "delivered" ? <CheckCircle2 className="h-7 w-7" /> : <Truck className="h-7 w-7" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Current booking status</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{formatStatus(booking.status)}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{stepDescriptions[booking.status] || "Your booking status has been updated."}</p>
              </div>
            </div>
            <div className="relative min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:min-w-[220px]">
              <p className="text-xs font-semibold text-slate-500">{booking.fare.finalFare == null ? "Estimated fare" : "Final fare"}</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{formatPrice(booking.fare.finalFare ?? booking.fare.estimatedFare)}</p>
              <p className="mt-2 text-xs text-slate-500">Payment: {formatStatus(booking.paymentStatus)}</p>
            </div>
          </div>
        </section>

        {/* Route card */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black tracking-tight sm:text-xl">Delivery route</h2>
              <p className="mt-1 text-sm text-slate-500">A visual guide to your booking progress</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Route className="h-4 w-4 text-orange-500" /> {booking.route.distanceKm} km</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-orange-500" /> {booking.route.durationMinutes} min estimate</span>
            </div>
          </div>

          <div className="mt-8 px-1 sm:px-3">
            <div className="relative h-4 rounded-full bg-slate-100">
              <div className={`absolute left-0 top-0 h-4 rounded-full transition-[width] duration-700 ease-out ${isCancelled ? "bg-red-400" : "bg-gradient-to-r from-orange-300 to-orange-500"}`} style={{ width: `${isCancelled ? 0 : progress}%` }} />
              {!isCancelled && (
                <span className="absolute top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-4 border-white bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition-[left] duration-700 ease-out" style={{ left: `clamp(20px, ${progress}%, calc(100% - 20px))` }}>
                  <Truck className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700"><MapPin className="h-4 w-4" /> Pickup</span>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800">{booking.pickup.address}</p>
              </div>
              <div className="min-w-0 text-right">
                <span className="inline-flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-700"><MapPin className="h-4 w-4" /> Destination</span>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800">{booking.drop.address}</p>
              </div>
            </div>
          </div>
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">This progress indicator reflects the booking status. It does not represent the truck's live GPS position.</p>
        </section>

        {/* Timeline and driver */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black tracking-tight">Delivery timeline</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Follow each stage as it is reported by the driver or platform.</p>

            {isCancelled ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 font-bold text-red-700"><XCircle className="h-5 w-5" /> Booking cancelled</div>
                {booking.cancellationReason && <p className="mt-2 text-sm leading-6 text-red-700">Reason: {booking.cancellationReason}</p>}
              </div>
            ) : (
              <div className="mt-7">
                {deliverySteps.map((step, index) => {
                  const complete = index <= currentStepIndex;
                  const current = index === currentStepIndex;
                  return (
                    <div key={step} className="relative flex gap-4 pb-6 last:pb-0">
                      {index !== deliverySteps.length - 1 && <span className={`absolute bottom-0 left-[15px] top-8 w-px ${index < currentStepIndex ? "bg-orange-400" : "bg-slate-200"}`} />}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${complete ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 bg-white text-slate-400"}`}>
                        {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-bold ${complete ? "text-slate-900" : "text-slate-400"}`}>{formatStatus(step)}</h3>
                          {current && <span className="rounded-full bg-orange-50 px-2 py-1 text-[9px] font-extrabold tracking-wider text-orange-700">CURRENT</span>}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{stepDescriptions[step]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><UserRound className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Driver information</h2>
                  <p className="text-xs text-slate-500">Your assigned delivery partner</p>
                </div>
              </div>

              {driver ? (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-base font-extrabold text-slate-900">{driver.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{vehicle && typeof vehicle === "object" ? vehicle.name : "Delivery vehicle"}</p>
                  {driver.phone ? (
                    <a href={`tel:${driver.phone}`} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-orange-700 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:ring-orange-200"><Phone className="h-4 w-4" /> {driver.phone}</a>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Driver phone number is not available.</p>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-bold text-amber-800">Driver not assigned yet</p>
                  <p className="mt-2 text-sm leading-6 text-amber-700">Driver details will appear here when an administrator assigns a driver.</p>
                </div>
              )}
              <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Contact details are shown when supplied by the booking API.</div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black tracking-tight">Package details</h2>
              <div className="mt-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Package className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Package description</p>
                  <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-800">{booking.package.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                <Weight className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-slate-700">{booking.package.weightKg} kg</span>
              </div>
              {booking.package.specialInstructions && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3.5"><p className="text-xs font-bold text-amber-800">Special instructions</p><p className="mt-1 text-sm leading-6 text-amber-800">{booking.package.specialInstructions}</p></div>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black tracking-tight">Booking summary</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Vehicle</span><span className="text-right font-semibold text-slate-800">{vehicle && typeof vehicle === "object" ? vehicle.name : "Not available"}</span></div>
                <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Distance</span><span className="font-semibold text-slate-800">{booking.route.distanceKm} km</span></div>
                <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Estimated time</span><span className="font-semibold text-slate-800">{booking.route.durationMinutes} min</span></div>
                <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Created</span><span className="max-w-[60%] text-right font-semibold text-slate-800">{formatDate(booking.createdAt)}</span></div>
                <div className="border-t border-dashed border-slate-200 pt-4"><p className="text-xs font-semibold text-slate-500">{booking.fare.finalFare == null ? "Estimated fare" : "Final fare"}</p><p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{formatPrice(booking.fare.finalFare ?? booking.fare.estimatedFare)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Payment status: {formatStatus(booking.paymentStatus)}</p></div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/customer/orders" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/15 transition hover:bg-orange-600"><ArrowLeft className="h-4 w-4" /> Back to My Orders</Link>
          <Link to="/customer/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">Book another delivery <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">Last checked: {formatDate(lastUpdated)} · Active bookings refresh automatically every 15 seconds. Live GPS tracking is not represented here.</p>
      </main>
    </div>
  );
}

export default BookingDetails;
