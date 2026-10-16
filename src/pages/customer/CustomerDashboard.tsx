import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
  Wifi,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
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
  | "cancelled"
  | string;

interface DashboardBooking {
  _id: string;
  bookingCode?: string;
  status: BookingStatus;
  createdAt?: string;
  pickup?: { address?: string };
  drop?: { address?: string };
  fare?: { estimatedFare?: number; finalFare?: number | null };
}

interface OnlineDriver {
  id: string;
  name: string;
  availability: "online";
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleCapacityKg: number;
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "assigned",
  "accepted",
  "arriving_at_pickup",
  "arrived_at_pickup",
  "picked_up",
  "in_transit",
  "arrived_at_drop",
]);

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClasses(status: string) {
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  if (ACTIVE_STATUSES.has(status)) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return "Your session may have expired. Please log in again.";
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo. Check that the backend server is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState("");

  const loadBookings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setPageError("");

    try {
      const response = await api.get("/bookings/my", {
        params: { page: 1, limit: 50 },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to load your bookings.");
      }
      setBookings(Array.isArray(response.data.bookings) ? response.data.bookings : []);
    } catch (error: unknown) {
      setPageError(getErrorMessage(error, "Unable to load your bookings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const loadOnlineDrivers = useCallback(async () => {
    try {
      const response = await api.get("/drivers/online");
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to load driver availability.");
      setOnlineDrivers(Array.isArray(response.data.drivers) ? response.data.drivers : []);
      setDriversError("");
    } catch (error: unknown) {
      setDriversError(getErrorMessage(error, "Unable to load currently available drivers."));
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOnlineDrivers();
    const interval = window.setInterval(() => void loadOnlineDrivers(), 15000);
    return () => window.clearInterval(interval);
  }, [loadOnlineDrivers]);

  const activeCount = bookings.filter((booking) => ACTIVE_STATUSES.has(booking.status)).length;
  const completedCount = bookings.filter((booking) => booking.status === "delivered").length;
  const recentBookings = [...bookings]
    .sort((first, second) => new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
<main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/90 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-9 lg:p-11">
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 -z-10 h-72 w-72 rounded-full border border-orange-100 sm:h-96 sm:w-96" />
          <div aria-hidden="true" className="pointer-events-none absolute right-10 top-10 -z-10 hidden rounded-[2rem] bg-orange-100/60 p-7 text-orange-500/70 lg:block">
            <Truck className="h-32 w-32" strokeWidth={1.1} />
          </div>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-orange-700 shadow-sm sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Your customer dashboard
            </span>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Welcome back, <span className="text-orange-600">{user?.name?.trim() || "Customer"}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              Your deliveries, bookings and updates—all in one place. Plan your next move with dependable delivery management from LogiGo.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/customer/book" className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">
                <Package className="h-5 w-5" />
                Book a delivery
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/customer/orders" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">
                <Truck className="h-5 w-5" />
                View my orders
              </Link>
            </div>
            {user?.email && (
              <p className="mt-5 flex items-center gap-2 break-all text-sm font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                Signed in as {user.email}
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="available-drivers-heading">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-[#101c30] to-[#1e314e] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Wifi className="h-5 w-5" /></span><div><h2 id="available-drivers-heading" className="text-lg font-black sm:text-xl">Drivers online now</h2><p className="mt-1 text-xs leading-5 text-slate-300">Approved drivers available to accept new deliveries.</p></div></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-extrabold text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400" />{driversLoading ? "Checking availability…" : `${onlineDrivers.length} available`}</span>
          </div>
          <div className="p-4 sm:p-5">
            {driversError ? <div role="status" className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>Driver availability is temporarily unavailable.</p><button type="button" onClick={() => { setDriversLoading(true); void loadOnlineDrivers(); }} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div> : driversLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div> : onlineDrivers.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center"><Users className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-extrabold text-slate-800">No drivers online right now</p><p className="mt-1 text-xs leading-5 text-slate-500">Availability refreshes automatically. You can still create a booking and dispatch will assign an eligible driver when one is available.</p></div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{onlineDrivers.map((driver) => <article key={driver.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101c30] text-emerald-300"><Truck className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-extrabold text-slate-900">{driver.name}</h3><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</span></div><p className="mt-1 break-words text-xs leading-5 text-slate-600">{driver.vehicleMakeModel || driver.vehicleType}</p><p className="mt-1 text-xs font-semibold text-slate-500">Vehicle type: {driver.vehicleType} · Up to {Number(driver.vehicleCapacityKg || 0).toLocaleString("en-IN")} kg</p></div></article>)}</div>}
            <p className="mt-3 text-[11px] leading-5 text-slate-400">Names and vehicle information are shown only for approved, active drivers who are online. The list refreshes about every 15 seconds.</p>
          </div>
        </section>

        {pageError && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{pageError}</p>
            <button type="button" onClick={() => void loadBookings(true)} disabled={refreshing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-bold transition hover:bg-rose-100 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Retry
            </button>
          </div>
        )}

        <section aria-labelledby="overview-heading">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Your activity</p>
              <h2 id="overview-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Delivery overview</h2>
            </div>
            <button type="button" onClick={() => void loadBookings(true)} disabled={refreshing || loading} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh activity
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-slate-500">Total bookings</p><p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{loading ? "—" : bookings.length}</p><p className="mt-2 text-xs text-slate-500">All bookings on your account</p></div>
                <span className="rounded-2xl bg-orange-50 p-3 text-orange-600"><Package className="h-5 w-5" /></span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-slate-500">Active deliveries</p><p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{loading ? "—" : activeCount}</p><p className="mt-2 text-xs text-slate-500">Bookings not yet delivered or cancelled</p></div>
                <span className="rounded-2xl bg-sky-50 p-3 text-sky-700"><Truck className="h-5 w-5" /></span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-slate-500">Completed deliveries</p><p className="mt-3 text-3xl font-black tabular-nums text-slate-950">{loading ? "—" : completedCount}</p><p className="mt-2 text-xs text-slate-500">Successfully delivered bookings</p></div>
                <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="quick-actions-heading">
          <div className="mb-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Get things moving</p>
            <h2 id="quick-actions-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Quick actions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">The tools you need to book, review and manage your deliveries.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Link to="/customer/book" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-900/[0.04] sm:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white"><Package className="h-6 w-6" /></span>
              <h3 className="mt-5 text-base font-extrabold text-slate-950">Book a delivery</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Add pickup and drop locations, choose a suitable vehicle and get an estimated fare.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700">Start booking <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
            <Link to="/customer/orders" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-900/[0.04] sm:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white"><Truck className="h-6 w-6" /></span>
              <h3 className="mt-5 text-base font-extrabold text-slate-950">My orders</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review booking details, follow current statuses and open individual delivery records.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700">View bookings <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
            <Link to="/customer/orders" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-900/[0.04] sm:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white"><CalendarClock className="h-6 w-6" /></span>
              <h3 className="mt-5 text-base font-extrabold text-slate-950">Booking history</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Find previous deliveries, check their status and revisit booking information.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700">Browse history <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="recent-bookings-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 id="recent-bookings-heading" className="text-lg font-black text-slate-950 sm:text-xl">Recent bookings</h2>
              <p className="mt-1 text-sm text-slate-500">A quick look at your latest delivery requests.</p>
            </div>
            <Link to="/customer/orders" className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-orange-700 hover:text-orange-800">View all orders <ArrowRight className="h-4 w-4" /></Link>
          </div>

          {loading ? (
            <div className="space-y-3 p-5 sm:p-6" aria-label="Loading bookings">
              {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : recentBookings.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentBookings.map((booking) => (
                <Link key={booking._id} to={`/customer/orders/${booking._id}`} className="flex flex-col gap-4 p-5 transition hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 rounded-xl bg-slate-100 p-2.5 text-slate-600"><Package className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-slate-950">{booking.bookingCode || `Booking ${booking._id.slice(-6).toUpperCase()}`}</span>
                      <span className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /><span className="line-clamp-2">{booking.pickup?.address || "Pickup unavailable"} <span className="text-slate-400">→</span> {booking.drop?.address || "Drop unavailable"}</span></span>
                      <span className="mt-1 block text-xs text-slate-400">{formatDate(booking.createdAt)}</span>
                    </span>
                  </div>
                  <span className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                    <span className="text-sm font-black tabular-nums text-slate-900">{formatCurrency(booking.fare?.finalFare ?? booking.fare?.estimatedFare)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-5 py-10 text-center sm:py-12">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Clock3 className="h-7 w-7" /></span>
              <h3 className="mt-4 text-base font-extrabold text-slate-950">No bookings yet</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Your delivery activity will appear here after you make your first booking. Ready when you are.</p>
              <Link to="/customer/book" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600">Book your first delivery <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LogiGo. Logistics, simplified.</p>
          <p className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Booking estimates are shown in INR.</p>
        </footer>
      </main>
    </div>
  );
};

export default CustomerDashboard;
