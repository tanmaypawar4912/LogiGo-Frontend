import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import { Activity, ArrowRight, CheckCircle2, Clock3, ClipboardList, Power, Truck, Wifi, WifiOff } from "lucide-react";
import api from "../../services/api";
import { useDriverJobs, getDriverError } from "../../hooks/useDriverJobs";

type Availability = "offline" | "online" | "busy";
type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
interface DriverProfileSummary { _id: string; approvalStatus: ApprovalStatus; availability: Availability; isActive: boolean; licenseExpiry: string; rejectionReason?: string; }
const card = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

export default function DriverDashboard() {
  const { jobs, loading: jobsLoading, error: jobsError, loadJobs } = useDriverJobs();
  const [profile, setProfile] = useState<DriverProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await api.get("/drivers/profile");
      if (!response.data?.success) throw new Error(response.data?.message || "Could not load driver profile.");
      setProfile(response.data.profile as DriverProfileSummary);
      setProfileMissing(false);
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 404) { setProfile(null); setProfileMissing(true); setError(""); }
      else setError(getDriverError(e, "Could not load driver profile."));
    } finally { setProfileLoading(false); }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const stats = useMemo(() => {
    const action = jobs.filter((job) => job.status === "assigned").length;
    const active = jobs.filter((job) => ["accepted", "arriving_at_pickup", "arrived_at_pickup", "picked_up", "in_transit", "arrived_at_drop"].includes(job.status)).length;
    const completed = jobs.filter((job) => job.status === "delivered").length;
    return [{ label: "Total jobs", value: jobs.length, icon: ClipboardList, color: "text-blue-300" }, { label: "Need your action", value: action, icon: Clock3, color: "text-amber-300" }, { label: "In progress", value: active, icon: Activity, color: "text-orange-300" }, { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-300" }];
  }, [jobs]);

  const canToggle = Boolean(profile && profile.approvalStatus === "approved" && profile.isActive && new Date(profile.licenseExpiry) > new Date() && profile.availability !== "busy");
  const currentAvailability = profile?.availability || "offline";

  async function toggleAvailability() {
    if (!profile || !canToggle || presenceBusy) return;
    setPresenceBusy(true); setMessage(""); setError("");
    const next = currentAvailability === "online" ? "offline" : "online";
    try {
      const response = await api.patch("/drivers/availability", { availability: next });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not update availability.");
      setMessage(response.data.message || `You are now ${next}.`);
      await loadProfile();
    } catch (e: unknown) { setError(getDriverError(e, "Could not update your availability.")); }
    finally { setPresenceBusy(false); }
  }


  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#101c30] via-[#101c30] to-[#302526] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-8 lg:p-9">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-300 sm:text-xs"><Truck className="h-3.5 w-3.5" /> Driver control center</span>
              <h1 className="mt-5 text-[clamp(2rem,4vw,3.4rem)] font-black leading-[1.05] tracking-tight">Your day. Your route.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">Your overview at a glance. Manage availability here and use My Jobs to handle every assigned delivery.</p>
            </div>
            <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.055] p-4 sm:p-5 xl:w-[430px]" aria-label="Driver availability">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${currentAvailability === "online" ? "bg-emerald-400/15 text-emerald-300" : currentAvailability === "busy" ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-slate-300"}`}>{currentAvailability === "online" ? <Wifi className="h-5 w-5" /> : currentAvailability === "busy" ? <Activity className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}</span><div><p className="text-xs font-semibold text-slate-400">Your availability</p><p className="mt-0.5 text-lg font-black capitalize">{profileLoading ? "Loading…" : currentAvailability}</p></div></div>
                <button type="button" onClick={() => void toggleAvailability()} disabled={!canToggle || presenceBusy || profileLoading} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${currentAvailability === "online" ? "border border-white/15 bg-white/10 text-white hover:bg-white/15" : "bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-400"}`}><Power className="h-4 w-4" />{presenceBusy ? "Updating…" : currentAvailability === "online" ? "Go offline" : currentAvailability === "busy" ? "Currently on a job" : "Go online"}</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Dispatch and administrators use this status to determine assignment eligibility. You cannot switch offline while an active job is in progress.</p>
            </section>
          </div>
          <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-slate-300 sm:text-sm">{label}</p><Icon className={`h-4 w-4 shrink-0 ${color}`} /></div><p className="mt-3 text-3xl font-black tabular-nums sm:text-4xl">{jobsLoading ? "—" : value}</p></article>)}
          </div>
        </section>

        {(error || jobsError) && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><p>{error || jobsError}<button type="button" onClick={() => { void loadProfile(); void loadJobs(); }} className="ml-2 font-extrabold underline">Retry</button></p>{error.includes("Cannot go online yet") && <div className="mt-3 flex flex-wrap gap-2"><Link to="/driver/documents" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-800 hover:bg-rose-100">Review documents</Link><Link to="/driver/profile" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-800 hover:bg-rose-100">Update profile and documents</Link></div>}</div>}
        {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}

        {profileMissing && <section className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}><div><h2 className="text-lg font-black">Complete your driver profile</h2><p className="mt-1 text-sm leading-6 text-slate-600">Submit your licence, vehicle information and required photos/documents. You must receive initial administrator approval before going online.</p></div><Link to="/driver/profile" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-orange-600">Complete profile <ArrowRight className="h-4 w-4" /></Link></section>}
      </div>
    </main>
  );
}
