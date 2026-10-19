

import { useCallback, useEffect, useMemo, useState } from "react";

import { Link } from "react-router";

import { isAxiosError } from "axios";

import {

  ArrowDownRight,

  ArrowRight,

  CheckCircle2,

  Clock3,


  MapPin,

  Package,

  RefreshCw,

  Search,


  Truck,

  UserRound,

  Users,

  Weight,

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

  _id: string;

  name: string;

  email: string;

  phone?: string;

}

interface Vehicle {

  _id: string;

  name: string;

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

  pickup: {

    address: string;

  };

  drop: {

    address: string;

  };

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

    estimatedFare: number;

    finalFare?: number | null;

  };

}

const statusLabel = (status: string) =>

  status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>

    letter.toUpperCase()

  );

const formatPrice = (amount?: number | null) =>

  new Intl.NumberFormat("en-IN", {

    style: "currency",

    currency: "INR",

    maximumFractionDigits: 2,

  }).format(Number.isFinite(amount) ? Number(amount) : 0);

const formatDate = (value: string) => {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return "Date unavailable";

  }

  return new Intl.DateTimeFormat("en-IN", {

    dateStyle: "medium",

    timeStyle: "short",

  }).format(date);

};

function statusClasses(status: string) {

  if (status === "delivered") {

    return "border-emerald-200 bg-emerald-50 text-emerald-700";

  }

  if (status === "cancelled") {

    return "border-red-200 bg-red-400/10 text-red-700";

  }

  if (status === "pending") {

    return "border-amber-200 bg-amber-50 text-amber-800";

  }

  return "border-blue-200 bg-blue-50 text-blue-700";

}

function getErrorMessage(error: unknown, fallback: string) {

  if (isAxiosError(error)) {

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

  return typeof customer === "object" && customer

    ? customer.name || "Customer"

    : "Customer";

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

function AdminDashboard() {

  const { user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  const [totalBookings, setTotalBookings] = useState(0);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(

    null

  );

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedDrivers, setSelectedDrivers] = useState<

    Record<string, string>

  >({});

  const [pageError, setPageError] = useState("");

  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async (manual = false) => {

    if (manual) {

      setRefreshing(true);

    } else {

      setLoading(true);

    }

    setPageError("");

    try {

      const response = await api.get("/bookings/admin/queue", {

        params: {

          status: "all",

          limit: 100,

        },

      });

      if (!response.data.success) {

        throw new Error(

          response.data.message || "Unable to load the admin dashboard."

        );

      }

      setBookings(response.data.bookings ?? []);

      setAvailableDrivers(response.data.availableDrivers ?? []);

      setTotalBookings(

        response.data.pagination?.total ??

        response.data.bookings?.length ??

        0

      );

    } catch (error: unknown) {

      setPageError(

        getErrorMessage(error, "Unable to load the admin dashboard.")

      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, []);

  useEffect(() => {

    void loadDashboard();

  }, [loadDashboard]);

  const pendingCount = bookings.filter(

    (booking) => booking.status === "pending"

  ).length;

  const activeCount = bookings.filter((booking) =>

    isActiveBooking(booking.status)

  ).length;

  const completedCount = bookings.filter(

    (booking) => booking.status === "delivered"

  ).length;

  const cancelledCount = bookings.filter(

    (booking) => booking.status === "cancelled"

  ).length;

  const completedFareTotal = bookings

    .filter((booking) => booking.status === "delivered")

    .reduce(

      (sum, booking) =>

        sum +

        (booking.fare.finalFare ??

          booking.fare.estimatedFare ??

          0),

      0

    );

  const filteredBookings = useMemo(() => {

    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {

      const matchesStatus =

        statusFilter === "all" || booking.status === statusFilter;

      const matchesSearch =

        !term ||

        booking.bookingCode.toLowerCase().includes(term) ||

        getCustomerName(booking.customer).toLowerCase().includes(term) ||

        booking.pickup.address.toLowerCase().includes(term) ||

        booking.drop.address.toLowerCase().includes(term) ||

        booking.package.description.toLowerCase().includes(term);

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

    const driver = availableDrivers.find(

      (item) => item.userId === driverUserId

    );

    if (!driver) {

      setPageError("The selected driver is no longer available. Refresh the list.");

      return;

    }

    if (driver.vehicleCapacityKg < booking.package.weightKg) {

      setPageError(

        `${driver.name}'s vehicle cannot carry this package weight.`

      );

      return;

    }

    const bookingVehicle =

      typeof booking.vehicle === "object" && booking.vehicle

        ? booking.vehicle

        : null;

    if (

      bookingVehicle?.slug &&

      driver.vehicleType !== bookingVehicle.slug

    ) {

      setPageError(

        `The selected driver vehicle type does not match ${bookingVehicle.name}.`

      );

      return;

    }

    const confirmed = window.confirm(

      `Assign ${booking.bookingCode} to ${driver.name}?`

    );

    if (!confirmed) return;

    setAssigningBookingId(booking._id);

    setPageError("");

    setNotice("");

    try {

      const response = await api.patch(

        `/bookings/admin/${booking._id}/assign`,

        { driverUserId }

      );

      setNotice(

        response.data.message || "Driver assigned successfully."

      );

      setSelectedDrivers((current) => {

        const next = { ...current };

        delete next[booking._id];

        return next;

      });

      await loadDashboard(true);

    } catch (error: unknown) {

      setPageError(

        getErrorMessage(error, "Unable to assign this driver.")

      );

    } finally {

      setAssigningBookingId(null);

    }

  };


  return (

    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">

              Operations overview

            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">

              Welcome, {user?.name || "Administrator"}

            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">

              Manage deliveries, assign available drivers and monitor the

              booking workflow from one place.

            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link

              to="/admin/drivers"

              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-400/30 hover:bg-slate-50"

            >

              <Users className="h-4 w-4 text-orange-600" />

              Driver approvals

              <ArrowRight className="h-4 w-4" />

            </Link>

            <button

              type="button"

              disabled={refreshing || loading}

              onClick={() => void loadDashboard(true)}

              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"

            >

              <RefreshCw

                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}

              />

              Refresh

            </button>

          </div>

        </div>

        {pageError && (

          <div

            role="alert"

            className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"

          >

            <p className="text-sm leading-6 text-red-700">{pageError}</p>

            <button

              type="button"

              onClick={() => void loadDashboard(true)}

              className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"

            >

              Try again

            </button>

          </div>

        )}

        {notice && (

          <div

            role="status"

            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-400/5 p-4 text-sm text-emerald-700"

          >

            <CheckCircle2 className="mr-2 inline h-4 w-4" />

            {notice}

          </div>

        )}

        {/* Dashboard statistics */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-300">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-500">Total bookings</span>

              <Package className="h-5 w-5 text-orange-600" />

            </div>

            <p className="mt-4 text-3xl font-black">

              {loading ? "—" : totalBookings.toLocaleString("en-IN")}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Bookings recorded in the database

            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-200">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-500">Pending assignments</span>

              <Clock3 className="h-5 w-5 text-amber-400" />

            </div>

            <p className="mt-4 text-3xl font-black text-amber-800">

              {loading ? "—" : pendingCount}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              In the latest 100 bookings loaded

            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-200">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-500">Active deliveries</span>

              <Truck className="h-5 w-5 text-blue-700" />

            </div>

            <p className="mt-4 text-3xl font-black">

              {loading ? "—" : activeCount}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Assigned or in progress

            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-200">

            <div className="flex items-center justify-between">

              <span className="text-sm text-slate-500">Available drivers</span>

              <Users className="h-5 w-5 text-emerald-700" />

            </div>

            <p className="mt-4 text-3xl font-black text-emerald-700">

              {loading ? "—" : availableDrivers.length}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Approved, active and currently online

            </p>

          </div>

        </section>

        {/* Supporting summary */}

        <section className="mt-5 grid gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">

            <p className="text-sm text-slate-500">

              Delivered bookings in loaded results

            </p>

            <p className="mt-3 text-2xl font-black text-emerald-700">

              {loading ? "—" : completedCount}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Includes {cancelledCount} cancelled bookings in the same result

              set, which are not counted as completed.

            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">

            <p className="text-sm text-slate-500">

              Estimated/final fare of delivered bookings

            </p>

            <p className="mt-3 text-2xl font-black">

              {loading ? "—" : formatPrice(completedFareTotal)}

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Calculated from the latest 100 loaded bookings; not a payment

              reconciliation or audited revenue total.

            </p>

          </div>

        </section>

        {/* Available drivers */}

        <section className="mt-10">

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">

                Fleet availability

              </p>

              <h2 className="mt-2 text-2xl font-black">

                Available drivers

              </h2>

              <p className="mt-2 text-sm text-slate-500">

                Approved drivers who are active and ready for assignment.

              </p>

            </div>

          </div>

          {!loading && availableDrivers.length === 0 && (

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">

              <p className="font-semibold">No online drivers available</p>

              <p className="mt-2 text-sm leading-6 text-slate-500">

                Ensure a driver is approved, active and online. Refresh this

                dashboard after their availability changes.

              </p>

            </div>

          )}

          {availableDrivers.length > 0 && (

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

              {availableDrivers.map((driver) => (

                <div

                  key={driver.userId}

                  className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition hover:border-emerald-200"

                >

                  <div className="flex items-start gap-3">

                    <div className="rounded-xl bg-emerald-50 p-3">

                      <UserRound className="h-5 w-5 text-emerald-700" />

                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="truncate font-bold">{driver.name}</h3>

                      <p className="mt-1 break-all text-xs text-slate-500">

                        {driver.email}

                      </p>

                    </div>

                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">

                      Online

                    </span>

                  </div>

                  <div className="mt-5 space-y-3 text-sm">

                    <div className="flex items-start gap-2">

                      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />

                      <div>

                        <p className="text-slate-200">

                          {driver.vehicleMakeModel}

                        </p>

                        <p className="mt-1 text-xs text-slate-500">

                          {driver.vehicleRegistration}

                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 text-slate-500">

                      <Weight className="h-4 w-4 text-slate-500" />

                      {driver.vehicleCapacityKg.toLocaleString("en-IN")} kg capacity

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* Booking management */}

        <section className="mt-12">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">

              Order management

            </p>

            <h2 className="mt-2 text-2xl font-black">

              Bookings and assignments

            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">

              Review bookings and assign compatible available drivers to

              pending requests.

            </p>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_230px]">

            <div className="relative">

              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input

                value={search}

                onChange={(event) => setSearch(event.target.value)}

                aria-label="Search bookings"

                placeholder="Search booking, customer, address..."

                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-orange-400"

              />

            </div>

            <select

              value={statusFilter}

              onChange={(event) =>

                setStatusFilter(event.target.value as StatusFilter)

              }

              aria-label="Filter bookings by status"

              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400"

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

          </div>

          {loading && (

            <div className="mt-6 rounded-2xl border border-slate-200 p-8 text-center">

              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-orange-600" />

              <p className="mt-3 text-sm text-slate-500">

                Loading booking operations...

              </p>

            </div>

          )}

          {!loading && !pageError && filteredBookings.length === 0 && (

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-10 text-center">

              <Package className="mx-auto h-9 w-9 text-slate-500" />

              <p className="mt-4 font-semibold">No matching bookings</p>

              <p className="mt-2 text-sm text-slate-500">

                Try another search or status filter.

              </p>

            </div>

          )}

          {!loading && filteredBookings.length > 0 && (

            <div className="mt-6 grid gap-5">

              {filteredBookings.map((booking) => {

                const vehicle =

                  typeof booking.vehicle === "object" && booking.vehicle

                    ? booking.vehicle

                    : null;

                const selectedDriverId = selectedDrivers[booking._id] || "";

                const eligibleDrivers = availableDrivers.filter(

                  (driver) =>

                    driver.vehicleCapacityKg >= booking.package.weightKg &&

                    (!vehicle?.slug || driver.vehicleType === vehicle.slug)

                );

                const assignedDriver = getDriverName(booking.driver);

                const fare =

                  booking.fare.finalFare ?? booking.fare.estimatedFare;

                const isAssigning = assigningBookingId === booking._id;

                return (

                  <article

                    key={booking._id}

                    className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 transition hover:border-slate-300 sm:p-6"

                  >

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="text-lg font-black">

                            {booking.bookingCode}

                          </h3>

                          <span

                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(booking.status)}`}

                          >

                            {statusLabel(booking.status)}

                          </span>

                        </div>

                        <p className="mt-2 text-xs text-slate-500">

                          Created {formatDate(booking.createdAt)}

                        </p>

                      </div>

                      <div className="sm:text-right">

                        <p className="text-xs text-slate-500">

                          {booking.fare.finalFare == null

                            ? "Estimated fare"

                            : "Final fare"}

                        </p>

                        <p className="mt-1 text-2xl font-black">

                          {formatPrice(fare)}

                        </p>

                      </div>

                    </div>

                    <div className="my-5 border-t border-slate-200" />

                    <div className="grid gap-5 md:grid-cols-2">

                      <div className="flex min-w-0 gap-3">

                        <UserRound className="mt-1 h-4 w-4 shrink-0 text-blue-700" />

                        <div className="min-w-0">

                          <p className="text-xs text-slate-500">Customer</p>

                          <p className="mt-1 font-semibold">

                            {getCustomerName(booking.customer)}

                          </p>

                          <p className="mt-1 break-all text-xs text-slate-500">

                            {getCustomerContact(booking.customer)}

                          </p>

                        </div>

                      </div>

                      <div className="flex min-w-0 gap-3">

                        <Truck className="mt-1 h-4 w-4 shrink-0 text-orange-600" />

                        <div className="min-w-0">

                          <p className="text-xs text-slate-500">Vehicle selected</p>

                          <p className="mt-1 font-semibold">

                            {vehicle?.name || "Vehicle unavailable"}

                          </p>

                          <p className="mt-1 text-xs text-slate-500">

                            Package weight: {booking.package.weightKg} kg

                          </p>

                        </div>

                      </div>

                      <div className="flex min-w-0 gap-3">

                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />

                        <div className="min-w-0">

                          <p className="text-xs text-slate-500">Pickup</p>

                          <p className="mt-1 break-words text-sm leading-6 text-slate-700">

                            {booking.pickup.address}

                          </p>

                        </div>

                      </div>

                      <div className="flex min-w-0 gap-3">

                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-orange-600" />

                        <div className="min-w-0">

                          <p className="text-xs text-slate-500">Drop</p>

                          <p className="mt-1 break-words text-sm leading-6 text-slate-700">

                            {booking.drop.address}

                          </p>

                        </div>

                      </div>

                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-xs text-slate-500">

                      <span className="inline-flex items-center gap-2">

                        <Package className="h-4 w-4 text-orange-600" />

                        {booking.package.description}

                      </span>

                      <span>{booking.route.distanceKm} km</span>

                      <span>{booking.route.durationMinutes} min estimated</span>

                      <span>Payment: {statusLabel(booking.paymentStatus)}</span>

                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">

                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                        <div>

                          <p className="text-xs text-slate-500">Assigned driver</p>

                          <p className="mt-1 font-semibold">{assignedDriver}</p>

                        </div>

                        <Link

                          to={`/customer/orders/${booking._id}`}

                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"

                        >

                          View booking

                          <ArrowRight className="h-4 w-4" />

                        </Link>

                      </div>

                      {booking.status === "pending" && !booking.driver && (

                        <div className="mt-5 border-t border-slate-200 pt-5">

                          <label

                            htmlFor={`driver-${booking._id}`}

                            className="block text-sm font-semibold text-slate-700"

                          >

                            Assign an available driver

                          </label>

                          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">

                            <select

                              id={`driver-${booking._id}`}

                              value={selectedDriverId}

                              onChange={(event) =>

                                setSelectedDrivers((current) => ({

                                  ...current,

                                  [booking._id]: event.target.value,

                                }))

                              }

                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400"

                            >

                              <option value="">Choose a driver</option>

                              {eligibleDrivers.map((driver) => (

                                <option

                                  key={driver.userId}

                                  value={driver.userId}

                                >

                                  {driver.name} — {driver.vehicleMakeModel} (

                                  {driver.vehicleCapacityKg.toLocaleString("en-IN")} kg)

                                </option>

                              ))}

                            </select>

                            <button

                              type="button"

                              disabled={

                                isAssigning ||

                                !selectedDriverId ||

                                eligibleDrivers.length === 0

                              }

                              onClick={() => void handleAssignDriver(booking)}

                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"

                            >

                              {isAssigning ? (

                                <RefreshCw className="h-4 w-4 animate-spin" />

                              ) : (

                                <ArrowDownRight className="h-4 w-4" />

                              )}

                              {isAssigning ? "Assigning..." : "Assign driver"}

                            </button>

                          </div>

                          {eligibleDrivers.length === 0 && (

                            <p className="mt-3 text-xs leading-5 text-amber-800">

                              No online driver matches this vehicle type and

                              package weight. Approve/bring an eligible driver

                              online or review the booking's vehicle selection.

                            </p>

                          )}

                        </div>

                      )}

                      {booking.status !== "pending" && (

                        <p className="mt-4 text-xs leading-5 text-slate-500">

                          Driver assignment is available only for unassigned

                          pending bookings.

                        </p>

                      )}

                    </div>

                  </article>

                );

              })}

            </div>

          )}

        </section>

        <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">

          <p>LogiGo Operations · Admin workspace</p>

          <p>

            Showing up to the latest 100 bookings. Total recorded bookings:{" "}

            {totalBookings.toLocaleString("en-IN")}.

          </p>

        </footer>

      </main>

    </div>

  );

}

export default AdminDashboard;
