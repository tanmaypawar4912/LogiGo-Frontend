import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Weight,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

type StatusFilter = "all" | BookingStatus;

interface AdminUser {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface Vehicle {
  _id?: string;
  name?: string;
  slug?: string;
  capacityKg?: number;
}

interface Driver {
  profileId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: number;
  availability: "online" | "busy" | "offline";
}

interface Booking {
  _id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: string;
  createdAt: string;
  customer: AdminUser | string | null;
  driver: AdminUser | string | null;
  vehicle: Vehicle | string | null;
  pickup: { address: string };
  drop: { address: string };
  package: {
    description: string;
    weightKg: number;
    specialInstructions?: string;
  };
  route: { distanceKm: number; durationMinutes: number };
  fare: { estimatedFare: number; finalFare?: number | null };
  dispatch?: {
    mode?: "automatic" | "manual";
    status?: "searching" | "offering" | "accepted" | "exhausted";
    attemptCount?: number;
    nextAttemptAt?: string | null;
    offers?: {
      driver?: string;
      status?: "offered" | "accepted" | "rejected" | "expired" | "lost";
      expiresAt?: string;
    }[];
  };
}

const statusLabel = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPrice = (amount?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? Number(amount) : 0);

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to manage bookings.";
    if (status === 429) return "Too many requests. Wait a moment, then try again.";
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo API. Check that the backend is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function getCustomerName(customer: Booking["customer"]) {
  return typeof customer === "object" && customer ? customer.name || "Customer" : "Customer";
}

function getCustomerContact(customer: Booking["customer"]) {
  return typeof customer === "object" && customer
    ? customer.email || customer.phone || "Contact unavailable"
    : "Contact unavailable";
}

function getDriverName(driver: Booking["driver"]) {
  return typeof driver === "object" && driver
    ? driver.name || "Assigned driver"
    : driver
      ? "Assigned driver"
      : "Not assigned";
}

function getVehicle(vehicle: Booking["vehicle"]): Vehicle | null {
  return typeof vehicle === "object" && vehicle ? vehicle : null;
}

function isActiveBooking(status: BookingStatus) {
  return [
    "assigned",
    "accepted",
    "arriving_at_pickup",
    "arrived_at_pickup",
    "picked_up",
    "in_transit",
    "arrived_at_drop",
  ].includes(status);
}

function statusClasses(status: BookingStatus) {
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "accepted", label: "Accepted" },
  { value: "arriving_at_pickup", label: "Arriving at pickup" },
  { value: "arrived_at_pickup", label: "Arrived at pickup" },
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "In transit" },
  { value: "arrived_at_drop", label: "Arrived at drop" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const cardClass = "rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]";
const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function AdminBookings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  // Uses the same established queue API and response shape as the Admin Dashboard.
  const loadBookings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setPageError("");

    try {
      const response = await api.get("/bookings/admin/queue", {
        params: { status: "all", limit: 100 },
      });
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load bookings.");
      }
      const rows = Array.isArray(response.data.bookings) ? response.data.bookings : [];
      setBookings(rows);
      setAvailableDrivers(Array.isArray(response.data.availableDrivers) ? response.data.availableDrivers : []);
      setTotalBookings(response.data.pagination?.total ?? rows.length);
    } catch (error: unknown) {
      setPageError(getErrorMessage(error, "Unable to load bookings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const activeCount = bookings.filter((booking) => isActiveBooking(booking.status)).length;
  const completedCount = bookings.filter((booking) => booking.status === "delivered").length;
  const cancelledCount = bookings.filter((booking) => booking.status === "cancelled").length;
  const completedFareTotal = bookings
    .filter((booking) => booking.status === "delivered")
    .reduce((sum, booking) => sum + (booking.fare.finalFare ?? booking.fare.estimatedFare ?? 0), 0);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      const matchesSearch =
        !term ||
        (booking.bookingCode ?? "").toLowerCase().includes(term) ||
        getCustomerName(booking.customer).toLowerCase().includes(term) ||
        (booking.pickup?.address ?? "").toLowerCase().includes(term) ||
        (booking.drop?.address ?? "").toLowerCase().includes(term) ||
        (booking.package?.description ?? "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const handleAssignDriver = async (booking: Booking) => {
    const driverUserId = selectedDrivers[booking._id];
    if (!driverUserId) {
      setPageError("Select an available driver before assigning the booking.");
      return;
    }
    if (booking.status !== "pending" || booking.driver) {
      setPageError("Only pending, unassigned bookings can be assigned.");
      return;
    }
    const driver = availableDrivers.find((item) => item.userId === driverUserId);
    if (!driver) {
      setPageError("The selected driver is no longer available. Refresh the list.");
      return;
    }
    if (driver.vehicleCapacityKg < booking.package.weightKg) {
      setPageError(`${driver.name}'s vehicle cannot carry this package weight.`);
      return;
    }
    const vehicle = getVehicle(booking.vehicle);
    if (vehicle?.slug && driver.vehicleType !== vehicle.slug) {
      setPageError(`The selected driver vehicle type does not match ${vehicle.name || "the booking vehicle"}.`);
      return;
    }
    if (!window.confirm(`Assign ${booking.bookingCode} to ${driver.name}?`)) return;

    setAssigningBookingId(booking._id);
    setPageError("");
    setNotice("");
    try {
      // Existing assignment endpoint and payload are intentionally unchanged.
      const response = await api.patch(`/bookings/admin/${booking._id}/assign`, { driverUserId });
      setNotice(response.data.message || "Driver assigned successfully.");
      setSelectedDrivers((current) => {
        const next = { ...current };
        delete next[booking._id];
        return next;
      });
      await loadBookings(true);
    } catch (error: unknown) {
      setPageError(getErrorMessage(error, "Unable to assign this driver."));
    } finally {
      setAssigningBookingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight">LogiGo Admin</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Booking operations</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{user?.name || "Administrator"}</span>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-orange-100">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">Operations workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Booking management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Bookings dispatch automatically to a small group of compatible online drivers. Use manual assignment only as an administrator override when needed.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/drivers" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-orange-100">
              <Users className="h-4 w-4 text-orange-600" /> Driver approvals <ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" disabled={refreshing || loading} onClick={() => void loadBookings(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-orange-100">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {pageError && (
          <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 text-sm leading-6 text-rose-800"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{pageError}</div>
            <button type="button" onClick={() => void loadBookings(true)} className="shrink-0 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">Try again</button>
          </div>
        )}
        {notice && <div role="status" className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Booking summary">
          <StatCard label="Total bookings" value={loading ? "—" : totalBookings.toLocaleString("en-IN")} note="All bookings recorded" icon={<Package className="h-5 w-5" />} accent="orange" />
          <StatCard label="Pending assignment" value={loading ? "—" : pendingCount} note="Automatic dispatch is working" icon={<Clock3 className="h-5 w-5" />} accent="amber" />
          <StatCard label="Active deliveries" value={loading ? "—" : activeCount} note="Assigned or in progress" icon={<Truck className="h-5 w-5" />} accent="blue" />
          <StatCard label="Delivered" value={loading ? "—" : completedCount} note={`${cancelledCount} cancelled in loaded results`} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className={`${cardClass} p-5 sm:p-6`}>
            <p className="text-sm font-semibold text-slate-500">Estimated/final fare for delivered bookings</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{loading ? "—" : formatPrice(completedFareTotal)}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Calculated only from the latest loaded results; this is not a payment reconciliation.</p>
          </div>
          <div className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Users className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="text-sm font-semibold text-slate-500">Online drivers available</p><p className="mt-1 text-2xl font-black text-slate-900">{loading ? "—" : availableDrivers.length}</p><p className="mt-1 text-xs leading-5 text-slate-400">Approved and ready for compatible assignments.</p></div>
            </div>
          </div>
        </section>

        <section className={`${cardClass} mt-7 p-4 sm:p-5`} aria-label="Search and filter bookings">
          <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Filter className="h-4 w-4" /></span><div><h2 className="font-extrabold">Find a booking</h2><p className="mt-0.5 text-xs text-slate-500">Search by booking code, customer or delivery address.</p></div></div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
            <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search bookings" placeholder="Search booking code, customer, pickup..." className={`${fieldClass} pl-11`} /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter bookings by status" className={fieldClass}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{loading ? "Loading bookings…" : `Showing ${filteredBookings.length} of ${bookings.length} loaded bookings`}</span>{(search || statusFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="font-bold text-orange-700 hover:text-orange-800">Clear filters</button>}</div>
        </section>

        {loading && <div className={`${cardClass} mt-6 p-12 text-center`}><RefreshCw className="mx-auto h-7 w-7 animate-spin text-orange-500" /><p className="mt-4 font-semibold text-slate-800">Loading booking operations</p><p className="mt-1 text-sm text-slate-500">Fetching the latest booking queue…</p></div>}

        {!loading && !pageError && filteredBookings.length === 0 && <div className={`${cardClass} mt-6 px-6 py-14 text-center`}><Package className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-extrabold text-slate-900">No matching bookings</h2><p className="mt-2 text-sm text-slate-500">Try changing the search term or status filter.</p></div>}

        {!loading && filteredBookings.length > 0 && (
          <section className="mt-6 grid gap-5" aria-label="Booking list">
            {filteredBookings.map((booking) => {
              const vehicle = getVehicle(booking.vehicle);
              const selectedDriverId = selectedDrivers[booking._id] || "";
              const eligibleDrivers = availableDrivers.filter((driver) =>
                driver.vehicleCapacityKg >= (booking.package?.weightKg ?? 0) &&
                (!vehicle?.slug || driver.vehicleType === vehicle.slug)
              );
              const isAssigning = assigningBookingId === booking._id;
              const fare = booking.fare?.finalFare ?? booking.fare?.estimatedFare ?? 0;

              return (
                <article key={booking._id} className={`${cardClass} min-w-0 overflow-hidden transition hover:border-orange-200`}>
                  <div className="border-b border-slate-100 bg-gradient-to-r from-white to-orange-50/40 p-4 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5"><span className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-extrabold text-white">{booking.bookingCode}</span><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(booking.status)}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel(booking.status)}</span>
                          {booking.status === "pending" && !booking.driver && <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">Auto dispatch: {statusLabel(booking.dispatch?.status || "searching")}</span>}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Created {formatDate(booking.createdAt)}</p>
                        {booking.status === "pending" && !booking.driver && <p className="mt-1 text-xs text-slate-500">{booking.dispatch?.offers?.filter((offer) => offer.status === "offered" && offer.expiresAt && new Date(offer.expiresAt) > new Date()).length || 0} active driver offer(s) · {booking.dispatch?.attemptCount || 0} dispatch round(s)</p>}
                      </div>
                      <div className="sm:text-right"><p className="text-xs font-semibold text-slate-500">{booking.fare?.finalFare == null ? "Estimated fare" : "Final fare"}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{formatPrice(fare)}</p><p className="mt-1 text-xs text-slate-400">Payment: {statusLabel(booking.paymentStatus || "unknown")}</p></div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                      <div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</p><p className="mt-1 break-words font-extrabold text-slate-900">{getCustomerName(booking.customer)}</p><p className="mt-1 break-all text-sm text-slate-500">{getCustomerContact(booking.customer)}</p></div></div>
                      <div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Truck className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle and package</p><p className="mt-1 break-words font-extrabold text-slate-900">{vehicle?.name || "Vehicle unavailable"}</p><p className="mt-1 text-sm text-slate-500">{booking.package?.description || "Package details unavailable"} · {booking.package?.weightKg ?? 0} kg</p></div></div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <RouteBlock icon={<MapPin className="h-4 w-4" />} label="Pickup location" address={booking.pickup?.address || "Pickup address unavailable"} tone="green" />
                      <RouteBlock icon={<MapPin className="h-4 w-4" />} label="Drop location" address={booking.drop?.address || "Drop address unavailable"} tone="orange" />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Package className="h-4 w-4 text-orange-500" />{booking.package?.description || "Package"}</span>
                      <span>{booking.route?.distanceKm ?? 0} km</span>
                      <span>{booking.route?.durationMinutes ?? 0} min estimated</span>
                      <span className="inline-flex items-center gap-1.5"><Weight className="h-4 w-4" />{booking.package?.weightKg ?? 0} kg</span>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned driver</p><p className="mt-1 font-extrabold text-slate-900">{getDriverName(booking.driver)}</p></div>
                        <Link to={`/customer/orders/${booking._id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100">View booking <ArrowRight className="h-4 w-4" /></Link>
                      </div>

                      {booking.status === "pending" && !booking.driver && (
                        <div className="mt-5 border-t border-slate-200 pt-5">
                          <label htmlFor={`driver-${booking._id}`} className="block text-sm font-extrabold text-slate-800">Admin override · assign a compatible online driver</label>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Automatic dispatch is already trying eligible drivers. Manual assignment overrides that queue; the backend still rechecks driver eligibility and atomically reserves the booking.</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <select id={`driver-${booking._id}`} value={selectedDriverId} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [booking._id]: event.target.value }))} className={fieldClass}>
                              <option value="">Choose a driver</option>
                              {eligibleDrivers.map((driver) => <option key={driver.userId} value={driver.userId}>{driver.name} — {driver.vehicleMakeModel} ({driver.vehicleCapacityKg.toLocaleString("en-IN")} kg)</option>)}
                            </select>
                            <button type="button" disabled={isAssigning || !selectedDriverId || eligibleDrivers.length === 0} onClick={() => void handleAssignDriver(booking)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-4 focus:ring-orange-100">
                              {isAssigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowDownRight className="h-4 w-4" />}{isAssigning ? "Assigning…" : "Assign driver"}
                            </button>
                          </div>
                          {eligibleDrivers.length === 0 && <p className="mt-3 text-xs leading-5 text-amber-800">No online driver matches this vehicle type and package weight. Approve an eligible driver or refresh after availability changes.</p>}
                        </div>
                      )}
                      {booking.status !== "pending" && <p className="mt-3 text-xs leading-5 text-slate-500">Driver assignment is available only for pending bookings without an assigned driver.</p>}
                      {booking.package?.specialInstructions && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5"><p className="text-xs font-bold text-amber-900">Special instructions</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-amber-900">{booking.package.specialInstructions}</p></div>}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-400 sm:flex-row"><p>LogiGo Operations · Booking management</p><p>Showing up to the latest 100 loaded bookings. Total recorded bookings: {totalBookings.toLocaleString("en-IN")}.</p></footer>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: ReactNode;
  accent: "orange" | "amber" | "blue" | "green";
}) {
  const accents = {
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
  return (
    <div className={`${cardClass} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300`}>
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-500">{label}</p><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accents[accent]}`}>{icon}</span></div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>
    </div>
  );
}

function RouteBlock({
  icon,
  label,
  address,
  tone,
}: {
  icon: ReactNode;
  label: string;
  address: string;
  tone: "green" | "orange";
}) {
  const tones = tone === "green"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-orange-50 text-orange-700";
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones}`}>{icon}</span>
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-sm leading-6 text-slate-700">{address}</p></div>
    </div>
  );
}

export default AdminBookings;
