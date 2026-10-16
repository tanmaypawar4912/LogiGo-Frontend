import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { isAxiosError } from "axios";
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  CircleHelp,
  ExternalLink,
  Info,
  LogOut,
  MessageSquareWarning,
  PackageCheck,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

type Preferences = {
  bookingAlerts: boolean;
  driverAlerts: boolean;
  complaintAlerts: boolean;
  reviewAlerts: boolean;
};

const STORAGE_KEY = "logigo_admin_preferences_v1";
const DEFAULT_PREFERENCES: Preferences = {
  bookingAlerts: true,
  driverAlerts: true,
  complaintAlerts: true,
  reviewAlerts: false,
};

const cardClass =
  "rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.035)]";

function readPreferences(): Preferences {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(saved) as Partial<Preferences>;
    return {
      bookingAlerts: typeof parsed.bookingAlerts === "boolean" ? parsed.bookingAlerts : true,
      driverAlerts: typeof parsed.driverAlerts === "boolean" ? parsed.driverAlerts : true,
      complaintAlerts: typeof parsed.complaintAlerts === "boolean" ? parsed.complaintAlerts : true,
      reviewAlerts: typeof parsed.reviewAlerts === "boolean" ? parsed.reviewAlerts : false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return "Your session may have expired. Please log in again.";
    if (error.response?.status === 403) return "You do not have permission to access this area.";
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo API. Check that the backend is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function PreferenceToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-orange-500" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 transition group-hover:bg-orange-100">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-orange-500" />
    </Link>
  );
}

function AdminSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [accountError, setAccountError] = useState("");

  const updatePreferences = (patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
    setSaveState("dirty");
  };

  const savePreferences = useCallback(() => {
    setSaveState("saving");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [preferences]);

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setAccountError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      setAccountError(getErrorMessage(error, "Unable to log out right now."));
    } finally {
      setLogoutLoading(false);
    }
  };

  const enabledPreferenceCount = Object.values(preferences).filter(Boolean).length;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Settings2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-900">LogiGo</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Admin workspace</span>
            </span>
          </Link>
          <Link to="/admin" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.19em] text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Platform configuration
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Settings</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Manage your admin preferences, check your account details, and jump directly to LogiGo operations settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={resetPreferences} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
              <RefreshCw className="h-4 w-4" /> Reset preferences
            </button>
            <button type="button" onClick={savePreferences} disabled={saveState === "saving" || saveState === "saved"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">
              {saveState === "saved" ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saveState === "saved" ? "Preferences saved" : saveState === "saving" ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`${cardClass} p-5`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Settings2 className="h-5 w-5" /></span>
            <p className="mt-4 text-sm font-bold text-slate-500">Admin preferences</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{enabledPreferenceCount} <span className="text-sm font-semibold text-slate-400">/ 4 enabled</span></p>
          </div>
          <div className={`${cardClass} p-5`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span>
            <p className="mt-4 text-sm font-bold text-slate-500">Session</p>
            <p className="mt-1 text-2xl font-black text-slate-950">Active</p>
            <p className="mt-1 text-xs text-slate-400">Current admin session</p>
          </div>
          <div className={`${cardClass} p-5`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Activity className="h-5 w-5" /></span>
            <p className="mt-4 text-sm font-bold text-slate-500">Operations</p>
            <p className="mt-1 text-2xl font-black text-slate-950">Live data</p>
            <p className="mt-1 text-xs text-slate-400">Managed through dedicated pages</p>
          </div>
          <div className={`${cardClass} p-5`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Bell className="h-5 w-5" /></span>
            <p className="mt-4 text-sm font-bold text-slate-500">Notification preferences</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{enabledPreferenceCount === 4 ? "All on" : enabledPreferenceCount === 0 ? "All off" : "Customized"}</p>
            <p className="mt-1 text-xs text-slate-400">Saved in this browser</p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100"><Bell className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Notification preferences</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Choose which operational categories you want this admin workspace to prioritize.</p>
              </div>
            </div>
            <div className="mt-4">
              <PreferenceToggle title="Booking activity" description="Preference for new bookings and booking workflow updates." checked={preferences.bookingAlerts} onChange={(checked) => updatePreferences({ bookingAlerts: checked })} />
              <PreferenceToggle title="Driver activity" description="Preference for driver onboarding and availability updates." checked={preferences.driverAlerts} onChange={(checked) => updatePreferences({ driverAlerts: checked })} />
              <PreferenceToggle title="Complaint activity" description="Preference for support issues and complaint follow-up." checked={preferences.complaintAlerts} onChange={(checked) => updatePreferences({ complaintAlerts: checked })} />
              <PreferenceToggle title="Customer reviews" description="Preference for customer feedback and rating updates." checked={preferences.reviewAlerts} onChange={(checked) => updatePreferences({ reviewAlerts: checked })} />
            </div>
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs leading-5 text-blue-900/80">These are local admin preferences saved in this browser. They do not send email, push alerts, or change backend notification settings.</p>
            </div>
            {saveState === "error" && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">Could not save preferences in this browser. Check local storage access and try again.</p>}
            {saveState === "dirty" && <p className="mt-3 text-sm font-semibold text-amber-700">You have unsaved changes.</p>}
          </section>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200"><UserRound className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Admin account</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Current signed-in account information.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</p>
                <p className="mt-1 break-words text-sm font-extrabold text-slate-900">{user?.name || "Administrator"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">{user?.email || "Email not available in auth context"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Authentication</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Managed by LogiGo authentication</p>
              </div>
            </div>
            {accountError && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{accountError}</p>}
            <button type="button" onClick={() => void handleLogout()} disabled={logoutLoading} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">
              <LogOut className="h-4 w-4" /> {logoutLoading ? "Signing out…" : "Sign out"}
            </button>
          </section>
        </div>

        <section className={`${cardClass} mt-6 p-5 sm:p-6`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Workspace shortcuts</p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">Manage LogiGo operations</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Open a dedicated admin page to work with current operational records.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <QuickLink to="/admin/bookings" icon={<PackageCheck className="h-5 w-5" />} title="Bookings" description="Review bookings and assign drivers." />
            <QuickLink to="/admin/customers" icon={<Users className="h-5 w-5" />} title="Customers" description="View customer activity and booking history." />
            <QuickLink to="/admin/drivers" icon={<Truck className="h-5 w-5" />} title="Drivers" description="Review driver profiles and approvals." />
            <QuickLink to="/admin/vehicles" icon={<Truck className="h-5 w-5" />} title="Vehicles" description="Review fleet details and capacity information." />
            <QuickLink to="/admin/pricing" icon={<Wallet className="h-5 w-5" />} title="Pricing" description="Review vehicle fare settings." />
            <QuickLink to="/admin/complaints" icon={<MessageSquareWarning className="h-5 w-5" />} title="Complaints" description="Review support issues and follow-up details." />
            <QuickLink to="/admin/reviews" icon={<CircleHelp className="h-5 w-5" />} title="Reviews" description="Review customer feedback and ratings." />
          </div>
        </section>

        <section className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-amber-950">Settings integration note</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">This page currently saves only the four admin display preferences to this browser. Backend-managed platform settings, password changes, and server-side notification delivery are not added here because the corresponding LogiGo settings endpoints were not confirmed in the supplied project context.</p>
          </div>
        </section>

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> LogiGo Admin Workspace</span>
          <span>Preferences are stored locally in this browser.</span>
        </footer>
      </main>
    </div>
  );
}

export default AdminSettings;
