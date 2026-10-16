import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquareWarning,
  Package,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import api from "../../services/api";

type ComplaintStatus = string;
type ComplaintPriority = string;

interface ComplaintUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface ComplaintBooking {
  _id?: string;
  id?: string;
  bookingCode?: string;
  status?: string;
  pickup?: { address?: string };
  drop?: { address?: string };
}

interface Complaint {
  _id: string;
  complaintCode?: string;
  ticketId?: string;
  subject?: string;
  title?: string;
  category?: string;
  type?: string;
  description?: string;
  message?: string;
  reason?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  customer?: ComplaintUser | string | null;
  user?: ComplaintUser | string | null;
  booking?: ComplaintBooking | string | null;
  bookingId?: string;
  adminNotes?: string;
  resolution?: string;
}

type ComplaintUpdatePayload = {
  status: string;
  priority: string;
  adminNotes: string;
  resolution: string;
};

type UpdateResult = {
  success: boolean;
  message: string;
};

type QuickFilter = "all" | "open" | "progress" | "resolved";

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

const normalize = (value?: string) => (value ?? "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
const displayLabel = (value?: string) =>
  (value ?? "unknown").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view complaint records.";
    if (status === 404) return "The complaints API was not found. Verify the backend route configured for this page.";
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

function getCustomer(complaint: Complaint): ComplaintUser | null {
  const value = complaint.customer ?? complaint.user;
  return typeof value === "object" && value ? value : null;
}

function getCustomerName(complaint: Complaint) {
  const customer = getCustomer(complaint);
  if (customer?.name) return customer.name;
  if (typeof (complaint.customer ?? complaint.user) === "string") return "Customer record";
  return "Customer not available";
}

function getBooking(complaint: Complaint): ComplaintBooking | null {
  return typeof complaint.booking === "object" && complaint.booking ? complaint.booking : null;
}

function getComplaintTitle(complaint: Complaint) {
  return complaint.subject || complaint.title || complaint.category || complaint.type || "Customer complaint";
}

function getComplaintMessage(complaint: Complaint) {
  return complaint.description || complaint.message || complaint.reason || "No additional description was provided.";
}

function isOpenStatus(status?: string) {
  return ["open", "pending", "new", "submitted", "unresolved"].includes(normalize(status));
}

function isProgressStatus(status?: string) {
  return ["in_progress", "in_review", "processing", "under_review", "investigating"].includes(normalize(status));
}

function isResolvedStatus(status?: string) {
  return ["resolved", "closed", "completed", "settled"].includes(normalize(status));
}

function statusClass(status?: string) {
  const value = normalize(status);
  if (isResolvedStatus(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (isProgressStatus(value)) return "border-sky-200 bg-sky-50 text-sky-700";
  if (["rejected", "cancelled", "dismissed"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (isOpenStatus(value)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function priorityClass(priority?: string) {
  const value = normalize(priority);
  if (["urgent", "critical", "high"].includes(value)) return "bg-rose-50 text-rose-700 ring-rose-200";
  if (["medium", "normal"].includes(value)) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatDate(value?: string) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";
}

function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingComplaintId, setSavingComplaintId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const loadComplaints = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    setNotice("");

    try {
      // API contract: this page expects an admin list endpoint returning
      // { success: true, complaints: Complaint[] } or { data: Complaint[] }.
      // Update this single path if your backend uses a different route.
      const response = await api.get("/complaints/admin");
      if (response.data?.success === false) {
        throw new Error(response.data.message || "Unable to load complaints.");
      }

      const payload = response.data?.complaints ?? response.data?.data?.complaints ?? response.data?.data ?? [];
      if (!Array.isArray(payload)) {
        throw new Error("The complaints API response format is not recognized. Expected a complaints array.");
      }
      setComplaints(payload as Complaint[]);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load complaint records."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  const updateComplaint = useCallback(
    async (id: string, payload: ComplaintUpdatePayload): Promise<UpdateResult> => {
      setError("");
      setNotice("");
      setSavingComplaintId(id);

      try {
        const response = await api.patch(`/complaints/admin/${id}`, payload);
        if (response.data?.success === false) {
          throw new Error(response.data.message || "Unable to update complaint.");
        }

        const updated = response.data?.complaint ?? response.data?.data?.complaint;
        if (!updated || typeof updated !== "object" || !updated._id) {
          throw new Error("The API did not return the updated complaint record.");
        }

        setComplaints((current) =>
          current.map((item) => (item._id === id ? ({ ...item, ...updated } as Complaint) : item))
        );
        setSelectedComplaint((current) =>
          current?._id === id ? ({ ...current, ...updated } as Complaint) : current
        );
        setNotice(response.data?.message || "Complaint updated successfully.");
        return { success: true, message: response.data?.message || "Complaint updated successfully." };
      } catch (requestError: unknown) {
        const message = getErrorMessage(requestError, "Unable to update this complaint.");
        return { success: false, message };
      } finally {
        setSavingComplaintId(null);
      }
    },
    []
  );

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(complaints.map((complaint) => normalize(complaint.status)).filter(Boolean)));
    return statuses.sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));
  }, [complaints]);

  const priorityOptions = useMemo(() => {
    const priorities = Array.from(new Set(complaints.map((complaint) => normalize(complaint.priority)).filter(Boolean)));
    return priorities.sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));
  }, [complaints]);

  const counts = useMemo(() => ({
    total: complaints.length,
    open: complaints.filter((complaint) => isOpenStatus(complaint.status)).length,
    progress: complaints.filter((complaint) => isProgressStatus(complaint.status)).length,
    resolved: complaints.filter((complaint) => isResolvedStatus(complaint.status)).length,
    highPriority: complaints.filter((complaint) => ["high", "urgent", "critical"].includes(normalize(complaint.priority))).length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => {
    const term = search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      const booking = getBooking(complaint);
      const customer = getCustomer(complaint);
      const matchesSearch = !term || [
        complaint.complaintCode,
        complaint.ticketId,
        complaint._id,
        getComplaintTitle(complaint),
        getComplaintMessage(complaint),
        complaint.category,
        complaint.type,
        complaint.status,
        complaint.priority,
        customer?.name,
        customer?.email,
        customer?.phone,
        booking?.bookingCode,
        typeof complaint.booking === "string" ? complaint.booking : "",
        complaint.bookingId,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));

      const value = normalize(complaint.status);
      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "open" && isOpenStatus(value)) ||
        (quickFilter === "progress" && isProgressStatus(value)) ||
        (quickFilter === "resolved" && isResolvedStatus(value));
      const matchesStatus = statusFilter === "all" || value === statusFilter;
      const matchesPriority = priorityFilter === "all" || normalize(complaint.priority) === priorityFilter;
      return matchesSearch && matchesQuick && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const aDate = new Date(a.createdAt ?? 0).getTime() || 0;
      const bDate = new Date(b.createdAt ?? 0).getTime() || 0;
      return bDate - aDate;
    });
  }, [complaints, search, quickFilter, statusFilter, priorityFilter]);

  const resetFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-900">LogiGo</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Admin workspace</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void loadComplaints(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-4">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-11">
        <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
              <LifeBuoy className="h-3.5 w-3.5" /> Customer support
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Complaints management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Review customer issues, find the related booking, and keep the support queue visible in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live data
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">Sorted by newest first</span>
          </div>
        </div>

        {notice && (
          <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />{notice}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="font-bold">Could not load complaints</p><p className="mt-1 leading-6">{error}</p></div>
            </div>
            <button type="button" onClick={() => void loadComplaints(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Complaint summary">
          <SummaryCard label="Total complaints" value={counts.total} detail="All records loaded" icon={MessageSquareWarning} tone="orange" />
          <SummaryCard label="Open queue" value={counts.open} detail="Awaiting attention" icon={Clock3} tone="amber" />
          <SummaryCard label="In progress" value={counts.progress} detail="Being reviewed" icon={CalendarClock} tone="blue" />
          <SummaryCard label="Resolved" value={counts.resolved} detail="Closed or completed" icon={BadgeCheck} tone="green" />
          <SummaryCard label="High priority" value={counts.highPriority} detail="High / urgent / critical" icon={AlertCircle} tone="rose" />
        </section>

        <section className={`${cardClass} mb-6 p-4 sm:p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-orange-600" />
            <h2 className="text-sm font-extrabold text-slate-900">Find a complaint</h2>
            <span className="ml-auto text-xs text-slate-400">{filteredComplaints.length} shown</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ticket, customer, booking, or message..."
                className={inputClass}
                aria-label="Search complaints"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setQuickFilter("all"); }} className={`${inputClass} appearance-none`} aria-label="Filter by status">
                <option value="all">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}
              </select>
            </div>
            <div className="relative">
              <AlertCircle className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className={`${inputClass} appearance-none`} aria-label="Filter by priority">
                <option value="all">All priorities</option>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{displayLabel(priority)}</option>)}
              </select>
            </div>
            <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
              Reset filters
            </button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {([
              ["all", "All complaints", counts.total],
              ["open", "Open", counts.open],
              ["progress", "In progress", counts.progress],
              ["resolved", "Resolved", counts.resolved],
            ] as const).map(([value, label, count]) => (
              <button key={value} type="button" onClick={() => { setQuickFilter(value); setStatusFilter("all"); }} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition ${quickFilter === value ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700"}`}>
                {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${quickFilter === value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={cardClass}>
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="font-extrabold text-slate-900">Support inbox</h2><p className="mt-1 text-xs text-slate-500">Complaint details and related booking information</p></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />{filteredComplaints.length} records</span>
          </div>

          {loading ? (
            <div className="space-y-3 p-4 sm:p-6" aria-label="Loading complaints">
              {[0, 1, 2, 3].map((item) => <div key={item} className="animate-pulse rounded-2xl border border-slate-100 p-4"><div className="flex gap-3"><div className="h-11 w-11 rounded-xl bg-slate-100" /><div className="flex-1"><div className="h-4 w-1/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-1/2 rounded bg-slate-100" /></div></div></div>)}
            </div>
          ) : !error && filteredComplaints.length === 0 ? (
            <div className="px-5 py-14 text-center sm:py-16">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-500"><MessageSquareWarning className="h-7 w-7" /></span>
              <h3 className="mt-5 text-lg font-extrabold text-slate-900">{complaints.length === 0 ? "No complaints found" : "No matching complaints"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{complaints.length === 0 ? "There are no complaint records in the API response yet." : "Try changing the search term or clearing filters to see more records."}</p>
              {complaints.length > 0 && <button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">Clear filters</button>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredComplaints.map((complaint) => {
                const customer = getCustomer(complaint);
                const booking = getBooking(complaint);
                const status = complaint.status || "unknown";
                const complaintId = complaint.complaintCode || complaint.ticketId || `#${complaint._id.slice(-7).toUpperCase()}`;
                return (
                  <article key={complaint._id} className="p-4 transition hover:bg-slate-50/80 sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600"><MessageSquareWarning className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] font-bold tracking-wide text-slate-400">{complaintId}</span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusClass(status)}`}>{displayLabel(status)}</span>
                            {complaint.priority && <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${priorityClass(complaint.priority)}`}>{displayLabel(complaint.priority)} priority</span>}
                          </div>
                          <h3 className="mt-2 break-words text-base font-extrabold text-slate-900 sm:text-lg">{getComplaintTitle(complaint)}</h3>
                          <p className="mt-2 line-clamp-2 max-w-3xl break-words text-sm leading-6 text-slate-500">{getComplaintMessage(complaint)}</p>
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />{formatDate(complaint.createdAt)}</span>
                            {complaint.category && <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{displayLabel(complaint.category)}</span>}
                            {(booking?.bookingCode || complaint.bookingId || typeof complaint.booking === "string") && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Booking {booking?.bookingCode || complaint.bookingId || (typeof complaint.booking === "string" ? complaint.booking.slice(-7) : "linked")}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 xl:w-60 xl:shrink-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">{initials(getCustomerName(complaint))}</span>
                          <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{getCustomerName(complaint)}</p><p className="mt-1 truncate text-xs text-slate-500">{customer?.email || customer?.phone || "Customer contact unavailable"}</p></div>
                        </div>
                        <button type="button" onClick={() => setSelectedComplaint(complaint)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-orange-200 hover:text-orange-700" aria-label={`View details for ${complaintId}`}>
                          View <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {!loading && !error && complaints.length > 0 && <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-400 sm:px-6">Showing {filteredComplaints.length} of {complaints.length} loaded complaints</div>}
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>Complaint status, priority, internal notes and resolution can be updated from the details panel. Updates are sent to the admin-protected backend endpoint and saved to the database.</p>
        </div>
      </main>

      {selectedComplaint && (
        <ComplaintDetailsModal
          complaint={selectedComplaint}
          saving={savingComplaintId === selectedComplaint._id}
          onSave={updateComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof MessageSquareWarning;
  tone: "orange" | "amber" | "blue" | "green" | "rose";
}) {
  const tones = {
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <div className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p></div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">{detail}</p>
    </div>
  );
}

function ComplaintDetailsModal({
  complaint,
  saving,
  onSave,
  onClose,
}: {
  complaint: Complaint;
  saving: boolean;
  onSave: (id: string, payload: ComplaintUpdatePayload) => Promise<UpdateResult>;
  onClose: () => void;
}) {
  const customer = getCustomer(complaint);
  const booking = getBooking(complaint);
  const ticketId = complaint.complaintCode || complaint.ticketId || `#${complaint._id.slice(-7).toUpperCase()}`;
  const linkedBookingId = booking?._id || booking?.id || complaint.bookingId || (typeof complaint.booking === "string" ? complaint.booking : "");
  const [status, setStatus] = useState(complaint.status || "open");
  const [priority, setPriority] = useState(complaint.priority || "medium");
  const [adminNotes, setAdminNotes] = useState(complaint.adminNotes || "");
  const [resolution, setResolution] = useState(complaint.resolution || "");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setStatus(complaint.status || "open");
    setPriority(complaint.priority || "medium");
    setAdminNotes(complaint.adminNotes || "");
    setResolution(complaint.resolution || "");
  }, [complaint._id, complaint.status, complaint.priority, complaint.adminNotes, complaint.resolution]);

  useEffect(() => {
    setFeedback(null);
  }, [complaint._id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const result = await onSave(complaint._id, { status, priority, adminNotes, resolution });
    setFeedback({ kind: result.success ? "success" : "error", message: result.message });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="complaint-detail-heading" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-600">Complaint details & case management</p><h2 id="complaint-detail-heading" className="mt-1 text-lg font-black text-slate-950">{ticketId}</h2></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close complaint details" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-6 p-5 sm:p-7">
          <div>
            <div className="flex flex-wrap gap-2"><span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-extrabold ${statusClass(complaint.status)}`}>{displayLabel(complaint.status)}</span>{complaint.priority && <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${priorityClass(complaint.priority)}`}>{displayLabel(complaint.priority)} priority</span>}</div>
            <h3 className="mt-4 text-xl font-black text-slate-950">{getComplaintTitle(complaint)}</h3>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{getComplaintMessage(complaint)}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem icon={UserRound} label="Customer" value={getCustomerName(complaint)} />
            <DetailItem icon={CalendarClock} label="Submitted" value={formatDate(complaint.createdAt)} />
            <DetailItem icon={Mail} label="Email" value={customer?.email || "Not available"} />
            <DetailItem icon={Phone} label="Phone" value={customer?.phone || "Not available"} />
            <DetailItem icon={Package} label="Category" value={displayLabel(complaint.category || complaint.type || "Not specified")} />
            <DetailItem icon={Clock3} label="Last updated" value={formatDate(complaint.updatedAt)} />
          </div>
          {(booking || linkedBookingId) && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 sm:p-5">
              <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Package className="h-4 w-4 text-orange-600" /> Related booking</h4>
              {booking?.bookingCode && <p className="mt-3 text-sm font-bold text-slate-800">{booking.bookingCode}</p>}
              {(booking?.pickup?.address || booking?.drop?.address) && <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">{booking.pickup?.address && <p><span className="font-bold text-slate-800">Pickup:</span> {booking.pickup.address}</p>}{booking.drop?.address && <p><span className="font-bold text-slate-800">Drop:</span> {booking.drop.address}</p>}</div>}
              {booking?.status && <p className="mt-3 text-xs text-slate-600">Booking status: <span className="font-bold">{displayLabel(booking.status)}</span></p>}
              {linkedBookingId && <Link to={`/customer/orders/${linkedBookingId}`} onClick={onClose} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800">Open booking <ExternalLink className="h-3.5 w-3.5" /></Link>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div><h4 className="text-sm font-extrabold text-slate-900">Update complaint</h4><p className="mt-1 text-xs leading-5 text-slate-500">Changes are saved to the backend. Keep notes professional and avoid storing sensitive customer information.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">Status
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" disabled={saving}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" disabled={saving}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600">Internal admin notes
              <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Internal progress notes for the support team..." disabled={saving} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60" />
              <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">{adminNotes.length}/2000</span>
            </label>
            <label className="block text-xs font-bold text-slate-600">Resolution / response
              <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={3} maxLength={2000} placeholder="Explain the resolution or outcome for this complaint..." disabled={saving} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60" />
              <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">{resolution.length}/2000</span>
            </label>
            {feedback && <div role={feedback.kind === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${feedback.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{feedback.message}</div>}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Close details</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </form>
          {(complaint.adminNotes || complaint.resolution || complaint.resolvedAt) && <div className="rounded-2xl border border-slate-200 p-4"><h4 className="text-sm font-extrabold text-slate-900">Previously saved resolution notes</h4>{complaint.adminNotes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{complaint.adminNotes}</p>}{complaint.resolution && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{complaint.resolution}</p>}{complaint.resolvedAt && <p className="mt-3 text-xs text-slate-400">Resolved {formatDate(complaint.resolvedAt)}</p>}</div>}
        </div>
      </section>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p></div></div>;
}

export default AdminComplaints;
