import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, MapPin, Package, Phone, RefreshCw, Route, Search, Truck, Weight, XCircle } from "lucide-react";
import api from "../../services/api";
import { type BookingStatus, type DriverJob, type JobFilter, formatDriverPrice, getDriverError, statusLabel, useDriverJobs } from "../../hooks/useDriverJobs";

const activeStatuses: BookingStatus[] = ["accepted", "arriving_at_pickup", "arrived_at_pickup", "picked_up", "in_transit", "arrived_at_drop"];
const nextAction: Partial<Record<BookingStatus, { status: BookingStatus; label: string; helper: string }>> = {
  accepted: { status: "arriving_at_pickup", label: "Start heading to pickup", helper: "Confirm when you start travelling to pickup." },
  arriving_at_pickup: { status: "arrived_at_pickup", label: "I've reached pickup", helper: "Confirm that you reached the pickup location." },
  arrived_at_pickup: { status: "picked_up", label: "Package picked up", helper: "Use after you collect the package." },
  picked_up: { status: "in_transit", label: "Start delivery trip", helper: "Confirm the package is on its way." },
  in_transit: { status: "arrived_at_drop", label: "I've reached destination", helper: "Confirm that you reached drop-off." },
  arrived_at_drop: { status: "delivered", label: "Confirm delivery", helper: "Only confirm after handing the package over." },
};
function statusClass(status: BookingStatus) {
  if (status === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "assigned") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}
function customerName(customer: DriverJob["customer"]) { return typeof customer === "object" && customer ? customer.name || "Customer" : "Customer details unavailable"; }
function customerPhone(customer: DriverJob["customer"]) { return typeof customer === "object" && customer ? customer.phone || "" : ""; }
function vehicleName(vehicle: DriverJob["vehicle"]) { return typeof vehicle === "object" && vehicle ? vehicle.name || "Vehicle" : typeof vehicle === "string" ? vehicle : "Vehicle not specified"; }
function jobDate(value?: string) { if (!value || Number.isNaN(new Date(value).getTime())) return "Date unavailable"; return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default function DriverJobs() {
  const { jobs, loading, refreshing, error, loadJobs } = useDriverJobs();
  const [filter, setFilter] = useState<JobFilter>("all");
  const [search, setSearch] = useState("");
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const counts = useMemo(() => ({ all: jobs.length, action: jobs.filter((job) => job.status === "assigned").length, active: jobs.filter((job) => activeStatuses.includes(job.status)).length, completed: jobs.filter((job) => job.status === "delivered").length }), [jobs]);
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesFilter = filter === "all" || (filter === "action" && job.status === "assigned") || (filter === "active" && activeStatuses.includes(job.status)) || (filter === "completed" && job.status === "delivered");
      const matchesSearch = !query || (job.bookingCode || "").toLowerCase().includes(query) || (job.pickup?.address || "").toLowerCase().includes(query) || (job.drop?.address || "").toLowerCase().includes(query) || (job.package?.description || "").toLowerCase().includes(query) || customerName(job.customer).toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [jobs, filter, search]);

  async function respond(jobId: string, action: "accept" | "reject") {
    if (action === "reject" && rejectionReason.trim().length < 3) { setActionError("Please enter a short reason before declining this job."); return; }
    setBusyJobId(jobId); setActionError(""); setSuccessMessage("");
    try {
      const response = await api.patch(`/bookings/${jobId}/respond`, action === "accept" ? { action } : { action, rejectionReason: rejectionReason.trim() });
      if (response.data?.success === false) throw new Error(response.data.message || `Could not ${action} this job.`);
      setSuccessMessage(action === "accept" ? "Job accepted. You can now update its delivery progress." : "Job declined. It will return to the dispatch queue.");
      setRejectingJobId(null); setRejectionReason(""); await loadJobs(true);
    } catch (e: unknown) { setActionError(getDriverError(e, `Could not ${action} this job.`)); }
    finally { setBusyJobId(null); }
  }
  async function updateStatus(jobId: string, status: BookingStatus) {
    setBusyJobId(jobId); setActionError(""); setSuccessMessage("");
    try {
      const response = await api.patch(`/bookings/${jobId}/status`, { status });
      if (response.data?.success === false) throw new Error(response.data.message || "Could not update delivery status.");
      setSuccessMessage(status === "delivered" ? "Delivery marked complete. Great work!" : `Delivery updated: ${statusLabel(status)}.`);
      await loadJobs(true);
    } catch (e: unknown) { setActionError(getDriverError(e, "Could not update delivery status.")); }
    finally { setBusyJobId(null); }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-[26px] bg-gradient-to-br from-[#101c30] via-[#101c30] to-[#28242a] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7 lg:p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Driver workspace / assignments</p>
          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-[clamp(1.9rem,4vw,3rem)] font-black tracking-tight">My jobs</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Review pickup and drop details, respond to assignments, and update each delivery through its permitted status steps.</p></div><button type="button" onClick={() => void loadJobs(true)} disabled={loading || refreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh jobs</button></div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Search and filter jobs">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, pickup, drop or customer…" aria-label="Search assigned jobs" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" /></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([{ id: "all", label: "All jobs", count: counts.all }, { id: "action", label: "Needs action", count: counts.action }, { id: "active", label: "In progress", count: counts.active }, { id: "completed", label: "Completed", count: counts.completed }] as const).map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition sm:text-sm ${filter === item.id ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50"}`}>{item.label}<span className={`rounded-full px-2 py-0.5 text-[10px] ${filter === item.id ? "bg-white/20" : "bg-slate-100"}`}>{item.count}</span></button>)}</div>
          </div>
        </section>

        {(error || actionError) && <div role="alert" className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div>{actionError || error}<button type="button" onClick={() => { setActionError(""); void loadJobs(); }} className="ml-2 font-extrabold underline">Try again</button></div></div>}
        {successMessage && <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{successMessage}</div>}

        {loading && <div className="mt-5 space-y-4">{[1, 2].map((item) => <div key={item} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"><div className="h-4 w-48 rounded bg-slate-200" /><div className="mt-4 h-20 rounded-xl bg-slate-100" /></div>)}</div>}
        {!loading && !error && filteredJobs.length === 0 && <section className="mt-5 rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm sm:py-16"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Truck className="h-8 w-8" /></span><h2 className="mt-5 text-xl font-black sm:text-2xl">{jobs.length === 0 ? "No jobs assigned yet" : "No jobs match this filter"}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{jobs.length === 0 ? "When dispatch assigns a delivery to your approved driver account, it will appear here." : "Try another filter or clear the search field."}</p>{(search || filter !== "all") && <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="mt-5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:bg-slate-50">Clear search and filters</button>}</section>}

        {!loading && filteredJobs.length > 0 && <section className="mt-5 space-y-4" aria-label="Assigned jobs">{filteredJobs.map((job: DriverJob) => {
          const action = nextAction[job.status];
          const customer = customerName(job.customer);
          const phone = customerPhone(job.customer);
          return <article key={job._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md"><div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300" /><div className="p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Package className="h-4 w-4" /></span><h2 className="break-all text-base font-black">{job.bookingCode || `Booking ${job._id.slice(-6)}`}</h2><span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${statusClass(job.status)}`}>{statusLabel(job.status)}</span></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />Assigned/updated {jobDate(job.updatedAt || job.createdAt)}</p></div><div className="rounded-xl bg-slate-50 px-4 py-3 sm:min-w-36 sm:text-right"><p className="text-xs font-semibold text-slate-500">Estimated / final fare</p><p className="mt-1 text-xl font-black">{formatDriverPrice(job.fare?.finalFare ?? job.fare?.estimatedFare)}</p></div></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2"><div className="flex min-w-0 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MapPin className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pickup</p><p className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">{job.pickup?.address || "Pickup address unavailable"}</p></div></div><div className="flex min-w-0 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><MapPin className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Drop</p><p className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">{job.drop?.address || "Drop address unavailable"}</p></div></div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-slate-100 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Customer</p><p className="mt-1 break-words text-sm font-bold">{customer}</p>{phone && <a href={`tel:${phone}`} className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:underline"><Phone className="h-3.5 w-3.5" />{phone}</a>}</div><div className="rounded-xl border border-slate-100 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Package</p><p className="mt-1 break-words text-sm font-bold">{job.package?.description || "Not specified"}</p><p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Weight className="h-3.5 w-3.5" />{job.package?.weightKg ?? "—"} kg</p></div><div className="rounded-xl border border-slate-100 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Vehicle</p><p className="mt-1 break-words text-sm font-bold">{vehicleName(job.vehicle)}</p><p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Route className="h-3.5 w-3.5" />{job.route?.distanceKm ?? "—"} km</p></div><div className="rounded-xl border border-slate-100 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Special instructions</p><p className="mt-1 break-words text-sm leading-5 text-slate-700">{job.package?.specialInstructions || "No special instructions"}</p></div></div>
            {job.status === "assigned" && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><p className="text-sm font-extrabold text-amber-950">This job needs your response</p><p className="mt-1 text-xs leading-5 text-amber-900/80">Accept to begin the delivery workflow, or decline with a short reason.</p>{rejectingJobId === job._id ? <div className="mt-3 space-y-3"><label className="block text-xs font-bold text-slate-700">Reason for declining<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={300} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="Enter a brief reason" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busyJobId === job._id} onClick={() => void respond(job._id, "reject")} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-50">{busyJobId === job._id ? "Submitting…" : "Confirm decline"}</button><button type="button" onClick={() => { setRejectingJobId(null); setRejectionReason(""); setActionError(""); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Cancel</button></div></div> : <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busyJobId === job._id} onClick={() => void respond(job._id, "accept")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50">{busyJobId === job._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Accept job</button><button type="button" disabled={busyJobId === job._id} onClick={() => { setRejectingJobId(job._id); setActionError(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-4 w-4" />Decline</button></div>}</div>}
            {action && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-xs leading-5 text-blue-900/80">{action.helper}</p><button type="button" disabled={busyJobId === job._id} onClick={() => void updateStatus(job._id, action.status)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101c30] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1c2e49] disabled:opacity-50">{busyJobId === job._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{busyJobId === job._id ? "Updating status…" : action.label}</button></div>}
            {job.status === "delivered" && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" />This delivery is complete.</div>}
          </div></article>;
        })}</section>}
      </div>
    </main>
  );
}
