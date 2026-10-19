import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
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
  | "cancelled"
  | string;

type CustomerFilter = "all" | "active" | "completed" | "cancelled";

interface BookingCustomer {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface Booking {
  _id: string;
  bookingCode?: string;
  status: BookingStatus;
  createdAt?: string;
  customer: BookingCustomer | string | null;
  pickup?: { address?: string };
  drop?: { address?: string };
  fare?: { estimatedFare?: number; finalFare?: number | null };
}

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  bookingCount: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  recordedFareTotal: number;
  lastBookingAt: string;
  lastBookingStatus: string;
  lastPickup: string;
  lastDrop: string;
}

const ACTIVE_STATUSES = new Set([
  "assigned",
  "accepted",
  "arriving_at_pickup",
  "arrived_at_pickup",
  "picked_up",
  "in_transit",
  "arrived_at_drop",
]);

const formatStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view customer records.";
    if (status === 429) return "Too many requests. Wait a moment, then refresh.";
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo API. Check that the backend is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function getCustomerKey(customer: Booking["customer"]) {
  if (typeof customer === "string") return customer.trim() || "unknown-customer";
  if (!customer) return null;
  return (
    customer._id ||
    customer.email?.trim().toLowerCase() ||
    customer.phone?.trim() ||
    customer.name?.trim().toLowerCase() ||
    null
  );
}

function createCustomerRecord(key: string, customer: Booking["customer"]): CustomerRecord {
  const profile = typeof customer === "object" && customer ? customer : null;
  return {
    id: key,
    name: profile?.name?.trim() || "Customer profile unavailable",
    email: profile?.email?.trim() || "Email not available",
    phone: profile?.phone?.trim() || "Phone not available",
    bookingCount: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    recordedFareTotal: 0,
    lastBookingAt: "",
    lastBookingStatus: "",
    lastPickup: "Address unavailable",
    lastDrop: "Address unavailable",
  };
}

function statusBadgeClasses(status: string) {
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  if (ACTIVE_STATUSES.has(status)) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function AdminCustomers() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookingCount, setTotalBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");

  const loadCustomers = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setPageError("");

    try {
      // Use the existing admin booking queue endpoint. Customer rows are
      // aggregated from populated customer profiles on those booking records.
      const response = await api.get("/bookings/admin/queue", {
        params: { status: "all", limit: 100 },
      });

      if (response.data?.success === false) {
        throw new Error(response.data.message || "Unable to load customer records.");
      }

      const nextBookings: Booking[] = Array.isArray(response.data?.bookings)
        ? response.data.bookings
        : [];
      setBookings(nextBookings);
      setTotalBookingCount(
        Number(response.data?.pagination?.total ?? nextBookings.length) || nextBookings.length
      );
    } catch (error: unknown) {
      setPageError(getErrorMessage(error, "Unable to load customer records."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>();

    for (const booking of bookings) {
      const key = getCustomerKey(booking.customer);
      if (!key) continue;

      let record = map.get(key);
      if (!record) {
        record = createCustomerRecord(key, booking.customer);
        map.set(key, record);
      } else if (typeof booking.customer === "object" && booking.customer) {
        // Fill any profile fields that may have been missing in an earlier booking.
        if (record.name === "Customer profile unavailable" && booking.customer.name) {
          record.name = booking.customer.name;
        }
        if (record.email === "Email not available" && booking.customer.email) {
          record.email = booking.customer.email;
        }
        if (record.phone === "Phone not available" && booking.customer.phone) {
          record.phone = booking.customer.phone;
        }
      }

      record.bookingCount += 1;
      if (ACTIVE_STATUSES.has(booking.status)) record.activeBookings += 1;
      if (booking.status === "delivered") record.completedBookings += 1;
      if (booking.status === "cancelled") record.cancelledBookings += 1;
      record.recordedFareTotal += Number(
        booking.fare?.finalFare ?? booking.fare?.estimatedFare ?? 0
      ) || 0;

      const currentDate = booking.createdAt ? new Date(booking.createdAt).getTime() : 0;
      const savedDate = record.lastBookingAt ? new Date(record.lastBookingAt).getTime() : 0;
      if (!record.lastBookingAt || currentDate >= savedDate) {
        record.lastBookingAt = booking.createdAt || "";
        record.lastBookingStatus = booking.status || "unknown";
        record.lastPickup = booking.pickup?.address || "Address unavailable";
        record.lastDrop = booking.drop?.address || "Address unavailable";
      }
    }

    return [...map.values()].sort((a, b) => {
      const aDate = a.lastBookingAt ? new Date(a.lastBookingAt).getTime() : 0;
      const bDate = b.lastBookingAt ? new Date(b.lastBookingAt).getTime() : 0;
      return bDate - aDate || a.name.localeCompare(b.name);
    });
  }, [bookings]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.id.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && customer.activeBookings > 0) ||
        (filter === "completed" && customer.completedBookings > 0) ||
        (filter === "cancelled" && customer.cancelledBookings > 0);

      return matchesSearch && matchesFilter;
    });
  }, [customers, filter, search]);

  const customersWithActiveJobs = customers.filter((customer) => customer.activeBookings > 0).length;
  const customersWithCompletedJobs = customers.filter((customer) => customer.completedBookings > 0).length;
  const deliveredBookings = bookings.filter((booking) => booking.status === "delivered").length;
  const activeBookings = bookings.filter((booking) => ACTIVE_STATUSES.has(booking.status)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-orange-500 p-3 text-white shadow-sm shadow-orange-200">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">LogiGo Admin</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Customer directory</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              type="button"
              onClick={() => void loadCustomers(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Customer insights
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Know your customers.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Review customer contact details and delivery activity in one place.
              Records below are grouped from the existing admin booking queue.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:self-auto">
            <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Bookings in source</p>
              <p className="text-lg font-black tabular-nums">{totalBookingCount.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Customers found"
            value={customers.length.toLocaleString("en-IN")}
            detail="Unique customer profiles in these records"
            icon={Users}
            iconClass="bg-orange-50 text-orange-600"
          />
          <StatCard
            label="With active deliveries"
            value={customersWithActiveJobs.toLocaleString("en-IN")}
            detail={`${activeBookings.toLocaleString("en-IN")} active booking(s)`}
            icon={Truck}
            iconClass="bg-sky-50 text-sky-700"
          />
          <StatCard
            label="Completed deliveries"
            value={deliveredBookings.toLocaleString("en-IN")}
            detail={`${customersWithCompletedJobs.toLocaleString("en-IN")} customer(s) with completions`}
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Cancelled bookings"
            value={bookings.filter((booking) => booking.status === "cancelled").length.toLocaleString("en-IN")}
            detail="Across the bookings loaded below"
            icon={XCircle}
            iconClass="bg-rose-50 text-rose-700"
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-lg font-extrabold">Customer records</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {visibleCustomers.length} of {customers.length} customers shown
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <label className="relative block min-w-0 flex-1 sm:min-w-72 lg:w-80 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, phone or ID"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    aria-label="Search customer records"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <Activity className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="sr-only">Filter customers</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as CustomerFilter)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none sm:w-44"
                  >
                    <option value="all">All customers</option>
                    <option value="active">Active deliveries</option>
                    <option value="completed">Completed delivery</option>
                    <option value="cancelled">Has cancellations</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {pageError && (
            <div role="alert" className="m-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:m-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Could not load customer records</p>
                <p className="mt-1 leading-5">{pageError}</p>
                <button
                  type="button"
                  onClick={() => void loadCustomers(true)}
                  className="mt-3 font-bold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 p-4 sm:p-6" aria-label="Loading customer records">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                {search || filter !== "all" ? <Search className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
              </div>
              <h4 className="mt-4 text-base font-extrabold">
                {search || filter !== "all" ? "No matching customers" : "No customer booking records yet"}
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search || filter !== "all"
                  ? "Try another search term or change the activity filter."
                  : "Customer details will appear here when bookings are returned by the admin booking queue."}
              </p>
              {(search || filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Delivery activity</th>
                      <th className="px-6 py-4">Recorded fare total</th>
                      <th className="px-6 py-4">Last booking</th>
                      <th className="px-6 py-4">Latest status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleCustomers.map((customer) => (
                      <tr key={customer.id} className="transition hover:bg-orange-50/40">
                        <td className="px-6 py-5">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={customer.name} />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">{customer.name}</p>
                              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                                <Mail className="h-3.5 w-3.5 shrink-0" />{customer.email}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="h-3.5 w-3.5 shrink-0" />{customer.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-extrabold tabular-nums">{customer.bookingCount} booking(s)</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {customer.activeBookings} active · {customer.completedBookings} delivered
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-extrabold tabular-nums">{formatCurrency(customer.recordedFareTotal)}</p>
                          <p className="mt-1 text-xs text-slate-500">Estimated/final fare data</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(customer.lastBookingAt)}
                          </p>
                          <p className="mt-1 max-w-52 truncate text-xs text-slate-500" title={`${customer.lastPickup} → ${customer.lastDrop}`}>
                            {customer.lastPickup} → {customer.lastDrop}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusBadgeClasses(customer.lastBookingStatus)}`}>
                            {formatStatus(customer.lastBookingStatus || "unknown")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {visibleCustomers.map((customer) => (
                  <article key={customer.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={customer.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="break-words font-extrabold">{customer.name}</h4>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${statusBadgeClasses(customer.lastBookingStatus)}`}>
                            {formatStatus(customer.lastBookingStatus || "unknown")}
                          </span>
                        </div>
                        <p className="mt-2 flex items-start gap-2 break-all text-xs leading-5 text-slate-500">
                          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />{customer.email}
                        </p>
                        <p className="mt-1 flex items-start gap-2 break-words text-xs text-slate-500">
                          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />{customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Bookings</p>
                        <p className="mt-1 font-extrabold">{customer.bookingCount}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Recorded fare total</p>
                        <p className="mt-1 font-extrabold">{formatCurrency(customer.recordedFareTotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Active / delivered</p>
                        <p className="mt-1 font-bold">{customer.activeBookings} / {customer.completedBookings}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Last booking</p>
                        <p className="mt-1 font-bold">{formatDate(customer.lastBookingAt)}</p>
                      </div>
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                      <span className="break-words">{customer.lastPickup} <span className="mx-1 text-slate-300">→</span> {customer.lastDrop}</span>
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              Activity counts reflect the booking records loaded from the admin queue, not a separate all-users registry.
            </p>
            <p className="shrink-0">Showing up to the latest 100 booking records</p>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-orange-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <p className="leading-6">
            <strong>Data scope:</strong> this page uses the already-known <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">/bookings/admin/queue</code> endpoint. It shows customers represented in those booking records; it does not claim to list every registered account or provide account suspension/deletion actions without a verified customer-management API.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight tabular-nums">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-sm font-black text-orange-700 ring-1 ring-orange-200/70">
      {initials}
    </div>
  );
}

export default AdminCustomers;
