import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, ChevronDown, ClipboardList, RefreshCw, Search, ShieldCheck, Truck, UserRound } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";

interface ActivityUser { _id?: string; name?: string; email?: string; role?: string; phone?: string; }
interface DriverActivityRecord {
  _id: string;
  driver: ActivityUser | string;
  driverProfile?: string | null;
  actor?: ActivityUser | string | null;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const panel = "rounded-2xl border border-slate-200 bg-white shadow-sm";
function getError(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot connect to LogiGo API. Check that the backend is running." : "Unable to load driver activity.");
  return error instanceof Error ? error.message : "Unable to load driver activity.";
}
function userName(value: ActivityUser | string | null | undefined) {
  if (!value) return "System";
  if (typeof value === "string") return value;
  return value.name || value.email || "Unknown user";
}
function userEmail(value: ActivityUser | string | null | undefined) {
  return value && typeof value === "object" ? value.email || "" : "";
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function actionTone(action: string) {
  if (action.includes("reject") || action.includes("suspend")) return "border-rose-200 bg-rose-50 text-rose-800";
  if (action.includes("approve") || action.includes("online")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (action.includes("job") || action.includes("status")) return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-orange-200 bg-orange-50 text-orange-800";
}

export default function AdminDriverActivity() {
  const [activities, setActivities] = useState<DriverActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const loadActivities = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await api.get("/drivers/admin/activities", { params: { limit: 200 } });
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to load driver activity.");
      setActivities(Array.isArray(response.data.activities) ? response.data.activities : []);
    } catch (e: unknown) { setError(getError(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void loadActivities(); }, [loadActivities]);

  const actionOptions = useMemo(() => Array.from(new Set(activities.map((item) => item.action))).sort(), [activities]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities.filter((item) => {
      const matchesAction = actionFilter === "all" || item.action === actionFilter;
      const matchesQuery = !query || [userName(item.driver), userEmail(item.driver), userName(item.actor), userEmail(item.actor), item.action, item.message, JSON.stringify(item.metadata || {})].join(" ").toLowerCase().includes(query);
      return matchesAction && matchesQuery;
    });
  }, [activities, search, actionFilter]);

  return <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">Operations audit trail</p><h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.75rem)] font-black tracking-tight text-[#101c30]">Driver activity</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Review driver availability, job assignments, delivery status updates, onboarding reviews and vehicle/document change requests.</p></div><button type="button" disabled={loading || refreshing} onClick={() => void loadActivities(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></header>

    <section className="mb-5 grid gap-3 sm:grid-cols-3"><article className={`${panel} p-4 sm:p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500 sm:text-sm">Recorded events</p><Activity className="h-5 w-5 text-orange-600" /></div><p className="mt-3 text-3xl font-black tabular-nums text-[#101c30]">{loading ? "—" : activities.length}</p></article><article className={`${panel} p-4 sm:p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500 sm:text-sm">Unique drivers</p><Truck className="h-5 w-5 text-blue-700" /></div><p className="mt-3 text-3xl font-black tabular-nums text-[#101c30]">{loading ? "—" : new Set(activities.map((item) => typeof item.driver === "string" ? item.driver : item.driver?._id).filter(Boolean)).size}</p></article><article className={`${panel} p-4 sm:p-5`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500 sm:text-sm">Visible after filters</p><ClipboardList className="h-5 w-5 text-emerald-700" /></div><p className="mt-3 text-3xl font-black tabular-nums text-[#101c30]">{loading ? "—" : visible.length}</p></article></section>

    <section className={`${panel} p-4 sm:p-5`}><div className="mb-4"><h2 className="text-base font-black sm:text-lg">Search audit records</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Search driver, actor, activity or metadata. Most recent events appear first.</p></div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]"><label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, action or booking…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" /></label><label className="relative block"><span className="sr-only">Filter by activity</span><select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"><option value="all">All activity types</option>{actionOptions.map((action) => <option value={action} key={action}>{action.replaceAll("_", " ")}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label></div></section>

    {error && <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800 sm:flex-row sm:items-center sm:justify-between"><p>{error}</p><button type="button" onClick={() => void loadActivities(true)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-extrabold hover:bg-rose-100"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}

    {loading ? <div className={`${panel} mt-5 space-y-3 p-5`} aria-label="Loading activity">{[1,2,3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div> : !error && visible.length === 0 ? <section className={`${panel} mt-5 px-5 py-14 text-center`}><CalendarClock className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-lg font-black">No driver activity found</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">As drivers submit profiles, change availability, receive jobs and update delivery status, those actions will be recorded here.</p>{(search || actionFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setActionFilter("all"); }} className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50">Clear filters</button>}</section> : !error && <section className={`${panel} mt-5 overflow-hidden`}><div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="font-black">Activity timeline</h2><p className="mt-1 text-xs text-slate-500">Showing {visible.length} of {activities.length} events</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-800"><ShieldCheck className="h-3.5 w-3.5" />Admin audit view</span></div><div className="divide-y divide-slate-100">{visible.map((item) => <article key={item._id} className="p-4 transition hover:bg-slate-50/70 sm:p-5"><div className="flex items-start gap-3 sm:gap-4"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101c30] text-orange-300"><Activity className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-black text-slate-950">{item.message}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${actionTone(item.action)}`}>{item.action.replaceAll("_", " ")}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />Driver: <strong className="text-slate-700">{userName(item.driver)}</strong></span>{userEmail(item.driver) && <span className="break-all">{userEmail(item.driver)}</span>}<span>Actor: <strong className="text-slate-700">{userName(item.actor)}</strong></span></div></div><time className="shrink-0 text-xs font-semibold text-slate-500">{formatDate(item.createdAt)}</time></div>{item.metadata && Object.keys(item.metadata).length > 0 && <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50"><summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-extrabold text-slate-600">View event details</summary><pre className="overflow-x-auto border-t border-slate-200 px-3 py-3 text-[11px] leading-5 text-slate-600">{JSON.stringify(item.metadata, null, 2)}</pre></details>}</div></div></article>)}</div></section>}
  </div></main>;
}
