import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Route,
  Search,
  Truck,
  Weight,
  XCircle,
  ClipboardList,
  PackageCheck,
  CircleDot,
  MessageSquareWarning,
  Star,
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

type FilterStatus = "all" | BookingStatus;

interface Booking {
  _id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: string;
  createdAt: string;
  vehicle:
    | {
        _id: string;
        name: string;
        capacityKg: number;
      }
    | string;
  pickup: { address: string };
  drop: { address: string };
  package: {
    description: string;
    weightKg: number;
  };
  route: {
    distanceKm: number;
    durationMinutes: number;
  };
  fare: {
    currency: string;
    estimatedFare: number;
    finalFare: number | null;
  };
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const statusLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function statusClasses(status: string) {
  switch (status) {
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "assigned":
    case "accepted":
    case "arriving_at_pickup":
    case "arrived_at_pickup":
    case "picked_up":
    case "in_transit":
    case "arrived_at_drop":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function statusIcon(status: BookingStatus) {
  if (status === "delivered") return CheckCircle2;
  if (status === "cancelled") return XCircle;
  if (status === "pending") return Clock3;
  return Truck;
}

function MyOrders() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bookings/my", {
        params: { page: 1, limit: 50 },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Could not load your bookings.");
      }

      setBookings(Array.isArray(response.data.bookings) ? response.data.bookings : []);
    } catch (requestError: unknown) {
      if (isAxiosError(requestError)) {
        setError(
          requestError.response?.data?.message ||
            (requestError.code === "ERR_NETWORK"
              ? "Could not connect to LogiGo. Check that the backend server is running."
              : "Could not load your bookings.")
        );
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load your bookings."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const searchText = search.trim().toLowerCase();

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchesSearch =
      !searchText ||
      (booking.bookingCode ?? "").toLowerCase().includes(searchText) ||
      (booking.pickup?.address ?? "").toLowerCase().includes(searchText) ||
      (booking.drop?.address ?? "").toLowerCase().includes(searchText) ||
      (booking.package?.description ?? "").toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  });

  const activeCount = bookings.filter(
    (booking) => !["delivered", "cancelled"].includes(booking.status)
  ).length;
  const completedCount = bookings.filter((booking) => booking.status === "delivered").length;
  const cancelledCount = bookings.filter((booking) => booking.status === "cancelled").length;

  return (
    <div className="w-full min-w-0 overflow-x-hidden text-slate-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Your deliveries
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              My Orders
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              All your deliveries in one place. Review booking details, follow your delivery status and return to tracking whenever you need.
            </p>
          </div>

          <Link
            to="/customer/book"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg"
          >
            <Package className="h-4 w-4" />
            Book a delivery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Booking summary cards */}
        <section className="mt-7 grid grid-cols-1 gap-3 sm:mt-9 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3" aria-label="Booking summary">
          <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Total bookings</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{bookings.length}</p>
                <p className="mt-1.5 text-xs text-slate-500">Bookings on your account</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
                <ClipboardList className="h-5 w-5" />
              </span>
            </div>
          </article>

          <article className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-900/[0.02] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Active bookings</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-orange-600 sm:text-4xl">{activeCount}</p>
                <p className="mt-1.5 text-xs text-slate-500">Not yet delivered or cancelled</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:scale-105">
                <Truck className="h-5 w-5" />
              </span>
            </div>
          </article>

          <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:col-span-2 sm:p-6 xl:col-span-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Delivered / Cancelled</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {completedCount}
                  <span className="mx-2 text-slate-300">/</span>
                  <span className="text-red-500">{cancelledCount}</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-500">Completed delivery history</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
                <PackageCheck className="h-5 w-5" />
              </span>
            </div>
          </article>
        </section>

        {/* Customer feedback and support shortcuts */}
        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Feedback and support">
          <Link
            to="/customer/reviews"
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md sm:p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
              <Star className="h-5 w-5" fill="currentColor" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">Rate a delivery</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Share feedback on completed deliveries and see your past reviews.</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
          </Link>
          <Link
            to="/customer/complaints"
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:p-5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:scale-105">
              <MessageSquareWarning className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">Help & complaints</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Report a problem, keep a reference number and track support updates.</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-orange-600" />
          </Link>
        </section>

        {/* Search and filters */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:mt-8 sm:p-5" aria-label="Search and filter bookings">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">Find a booking</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Search by booking code, address or package description.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredBookings.length} of {bookings.length}
            </span>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto]">
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search booking code, address or package"
                aria-label="Search bookings"
                className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block min-w-0">
              <span className="sr-only">Filter bookings by status</span>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                aria-label="Filter bookings by status"
                className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="accepted">Accepted</option>
                <option value="arriving_at_pickup">Arriving at pickup</option>
                <option value="arrived_at_pickup">Arrived at pickup</option>
                <option value="picked_up">Picked up</option>
                <option value="in_transit">In transit</option>
                <option value="arrived_at_drop">Arrived at drop</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadBookings()}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        {/* Error state */}
        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-600">
                <XCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-red-800">We couldn’t load your orders</h2>
                <p className="mt-1.5 break-words text-sm leading-6 text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadBookings()}
                  disabled={loading}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="mt-6 grid gap-4" aria-label="Loading bookings" aria-live="polite">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <div className="h-4 w-44 rounded bg-slate-200" />
                    <div className="h-3 w-32 rounded bg-slate-100" />
                  </div>
                  <div className="h-7 w-28 rounded-lg bg-slate-100" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredBookings.length === 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:px-8 sm:py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
              {bookings.length === 0 ? <Package className="h-8 w-8" /> : <Search className="h-8 w-8" />}
            </div>
            <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {bookings.length === 0 ? "Your next move starts here" : "No matching bookings"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              {bookings.length === 0
                ? "Your delivery bookings will appear here after you create your first booking."
                : "Try another booking code, address, package description or status filter."}
            </p>
            {bookings.length === 0 ? (
              <Link
                to="/customer/book"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
              >
                Create your first booking <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setSearch(""); setFilterStatus("all"); }}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Clear search and filters
              </button>
            )}
          </section>
        )}

        {/* Booking cards */}
        {!loading && !error && filteredBookings.length > 0 && (
          <section className="mt-6 space-y-4" aria-label="Your bookings">
            {filteredBookings.map((booking) => {
              const vehicleName = typeof booking.vehicle === "object"
                ? booking.vehicle.name
                : "Vehicle details unavailable";
              const displayedFare = booking.fare.finalFare ?? booking.fare.estimatedFare;
              const StatusIcon = statusIcon(booking.status);
              const active = !["delivered", "cancelled"].includes(booking.status);

              return (
                <article
                  key={booking._id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-900/[0.04]"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300" />
                  <div className="p-4 sm:p-6 lg:p-7">
                    <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                            <Package className="h-4 w-4" />
                          </span>
                          <h2 className="break-all text-sm font-black tracking-tight text-slate-900 sm:text-base">
                            {booking.bookingCode}
                          </h2>
                          <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold sm:text-xs ${statusClasses(booking.status)}`}>
                            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                            {statusLabel(booking.status)}
                          </span>
                        </div>
                        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:pl-11">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          Booked {formatDate(booking.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 sm:min-w-36 sm:flex-col sm:items-end sm:bg-transparent sm:px-0 sm:py-0">
                        <div className="sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
                            {booking.fare.finalFare == null ? "Estimated fare" : "Final fare"}
                          </p>
                          <p className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                            {formatPrice(displayedFare)}
                          </p>
                        </div>
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 sm:hidden">
                          {statusLabel(booking.paymentStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_190px]">
                      <div className="flex min-w-0 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-xs">Pickup location</p>
                          <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-800">
                            {booking.pickup?.address || "Pickup address unavailable"}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-w-0 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-xs">Drop location</p>
                          <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-800">
                            {booking.drop?.address || "Drop address unavailable"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-white p-3.5 sm:p-4 xl:grid-cols-1">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <Truck className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-500">Vehicle</p>
                            <p className="mt-0.5 break-words text-xs font-bold text-slate-800 sm:text-sm">{vehicleName}</p>
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Route className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-500">Distance</p>
                            <p className="mt-0.5 text-xs font-bold text-slate-800 sm:text-sm">
                              {booking.route?.distanceKm ?? "—"} km
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 flex-col gap-4 border-t border-slate-100 pt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                        <span className="inline-flex max-w-full items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="break-words">{booking.package?.description || "Package details unavailable"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Weight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          {booking.package?.weightKg ?? "—"} kg
                        </span>
                        <span className="hidden items-center gap-1.5 sm:inline-flex">
                          <CircleDot className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          Payment: {statusLabel(booking.paymentStatus)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" />
                          {booking.route?.durationMinutes ?? "—"} min est.
                        </span>
                      </div>

                      <Link
                        to={`/customer/orders/${booking._id}`}
                        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${
                          active
                            ? "bg-orange-500 text-white shadow-sm shadow-orange-500/15 hover:bg-orange-600"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        }`}
                      >
                        {active ? "Track delivery" : "View details"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 py-5 text-[11px] leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>LogiGo · Customer workspace</span>
          <span>Need to arrange another move? <Link to="/customer/book" className="font-bold text-orange-700 hover:text-orange-800">Book a delivery</Link></span>
        </footer>
      </main>
    </div>
  );
}


export default MyOrders;
