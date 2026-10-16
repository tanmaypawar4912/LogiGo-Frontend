import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowUpRight,
  Activity,
  Boxes,
  CalendarCheck,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Package,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type WorkspaceRole = "customer" | "driver" | "admin";
type SidebarItem = { label: string; to: string; icon: typeof LayoutDashboard; hint?: string };

const navigation: Record<WorkspaceRole, SidebarItem[]> = {
  customer: [
    { label: "Overview", to: "/customer", icon: LayoutDashboard },
    { label: "Book delivery", to: "/customer/book", icon: Package, hint: "Create a shipment" },
    { label: "My orders", to: "/customer/orders", icon: ClipboardList },
    { label: "My profile", to: "/customer/profile", icon: UserRound },
    { label: "Reviews", to: "/customer/reviews", icon: Star },
    { label: "Complaints & support", to: "/customer/complaints", icon: MessageSquareWarning },
  ],
  driver: [
    { label: "Overview", to: "/driver", icon: LayoutDashboard },
    { label: "My jobs", to: "/driver/jobs", icon: ClipboardList, hint: "Assigned deliveries" },
    { label: "My profile & approval", to: "/driver/profile", icon: UserRound },
    { label: "Vehicle details", to: "/driver/vehicles", icon: Truck },
    { label: "Documents", to: "/driver/documents", icon: FileText },
  ],
  admin: [
    { label: "Overview", to: "/admin", icon: LayoutDashboard },
    { label: "Bookings & dispatch", to: "/admin/bookings", icon: CalendarCheck },
    { label: "Customers", to: "/admin/customers", icon: Users },
    { label: "Drivers", to: "/admin/drivers", icon: Truck },
    { label: "Driver approvals", to: "/admin/driver-approvals", icon: ShieldCheck },
    { label: "Driver activity", to: "/admin/driver-activity", icon: Activity },
    { label: "Vehicle types", to: "/admin/vehicles", icon: Boxes },
    { label: "Pricing", to: "/admin/pricing", icon: CircleDollarSign },
    { label: "Complaints", to: "/admin/complaints", icon: MessageSquareWarning },
    { label: "Reviews", to: "/admin/reviews", icon: Star },
    { label: "Settings", to: "/admin/settings", icon: Settings },
  ],
};

const workspaceText: Record<WorkspaceRole, { title: string; subtitle: string }> = {
  customer: { title: "Customer workspace", subtitle: "Your deliveries, all together" },
  driver: { title: "Driver workspace", subtitle: "Your routes. Your deliveries." },
  admin: { title: "Admin workspace", subtitle: "Operations & platform control" },
};
const mobilePrimary: Record<WorkspaceRole, string[]> = {
  customer: ["/customer", "/customer/book", "/customer/orders"],
  driver: ["/driver", "/driver/jobs", "/driver/profile"],
  admin: ["/admin", "/admin/bookings", "/admin/drivers"],
};
const mobileLabels: Record<WorkspaceRole, string[]> = {
  customer: ["Home", "Book", "Orders"],
  driver: ["Overview", "Jobs", "Profile"],
  admin: ["Home", "Bookings", "Drivers"],
};

function isActiveItem(to: string, pathname: string, role: WorkspaceRole) {
  const basePath = `/${role}`;
  if (to === basePath) return pathname === basePath;
  return pathname === to || pathname.startsWith(`${to}/`);
}
function initials(name?: string | null) {
  return (name || "LogiGo User").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "LG";
}

export default function DashboardLayout({ role, children }: { role: WorkspaceRole; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = navigation[role];
  const workspace = workspaceText[role];
  const darkDriver = role === "driver";

  async function handleLogout() {
    try { await logout(); } finally { navigate("/login", { replace: true }); }
  }

  function renderNavItem(item: SidebarItem, compact = false) {
    const Icon = item.icon;
    const active = isActiveItem(item.to, location.pathname, role);
    return (
      <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} aria-current={active ? "page" : undefined}
        className={`group flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-[clamp(0.76rem,0.9vw,0.875rem)] font-semibold transition ${active ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : darkDriver ? "text-slate-200 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"} ${compact ? "justify-center px-2" : ""}`}>
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : darkDriver ? "text-slate-400 group-hover:text-orange-300" : "text-slate-400 group-hover:text-orange-600"}`} aria-hidden="true" />
        {!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!compact && item.hint && <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${active ? "text-orange-100" : darkDriver ? "text-slate-500" : "text-slate-300"}`} aria-hidden="true" />}
      </Link>
    );
  }

  return (
    <div className={`min-h-screen text-slate-900 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] ${darkDriver ? "bg-[#f7f9fc]" : "bg-slate-50"}`}>
      <aside className={`sticky top-0 hidden h-screen min-h-0 flex-col px-3 py-3 lg:flex ${darkDriver ? "bg-[#101c30] text-white" : "border-r border-slate-200/80 bg-white"}`}>
        <Link to={`/${role}`} className="flex shrink-0 items-center gap-3 rounded-xl px-2 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">{role === "admin" ? <ShieldCheck className="h-5 w-5" /> : <Truck className="h-5 w-5" />}</span>
          <span className="min-w-0"><span className={`block text-xl font-black tracking-tight ${darkDriver ? "text-white" : "text-slate-950"}`}>LogiGo</span><span className={`mt-0.5 block truncate text-[9px] font-extrabold uppercase tracking-[0.2em] ${darkDriver ? "text-slate-400" : "text-slate-400"}`}>{workspace.title}</span></span>
        </Link>

        <div className={`mt-4 shrink-0 rounded-2xl border p-3 ${darkDriver ? "border-white/10 bg-white/[0.06]" : "border-slate-100 bg-slate-50"}`}>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${darkDriver ? "bg-white text-[#101c30]" : "bg-[#101c30] text-white"}`}>{initials(user?.name)}</span>
            <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-extrabold ${darkDriver ? "text-white" : "text-slate-900"}`}>{user?.name || (role === "driver" ? "Driver account" : role === "admin" ? "Administrator" : "Customer account")}</span><span className={`mt-0.5 block truncate text-[11px] ${darkDriver ? "text-slate-400" : "text-slate-500"}`}>{role === "admin" ? "Administrator" : role === "driver" ? "Delivery partner" : "Customer account"}</span></span>
            <span title="Signed in" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          </div>
          {user?.email && <p className={`mt-2 truncate border-t pt-2 text-[11px] ${darkDriver ? "border-white/10 text-slate-400" : "border-slate-200/80 text-slate-500"}`}>{user.email}</p>}
          {user?.phone && darkDriver && <p className="mt-1 truncate text-[11px] text-slate-400">{user.phone}</p>}
        </div>

        <div className="mb-1 mt-5 flex shrink-0 items-center justify-between px-2.5"><p className={`text-[9px] font-extrabold uppercase tracking-[0.18em] ${darkDriver ? "text-slate-500" : "text-slate-400"}`}>Workspace menu</p><Gauge className="h-3.5 w-3.5 text-orange-400" /></div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`${workspace.title} navigation`}>
          {items.map((item) => renderNavItem(item))}
        </nav>

        <div className={`mt-2 shrink-0 border-t pt-2 ${darkDriver ? "border-white/10" : "border-slate-100"}`}>
          <Link to="/" className={`mb-1 flex min-h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-semibold transition ${darkDriver ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><ArrowUpRight className="h-4 w-4" />Back to public site</Link>
          <button type="button" onClick={() => void handleLogout()} className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/20 ${darkDriver ? "text-rose-300 hover:bg-rose-400/10" : "text-rose-600 hover:bg-rose-50"}`}><LogOut className="h-[17px] w-[17px]" />Sign out</button>
          <p className={`mt-2 px-3 text-[9px] font-medium ${darkDriver ? "text-slate-500" : "text-slate-400"}`}>LogiGo · Moving your world</p>
        </div>
      </aside>

      <div className="min-w-0 pb-20 lg:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden" aria-label="Mobile workspace navigation">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {mobilePrimary[role].map((to, index) => {
            const item = items.find((candidate) => candidate.to === to) ?? items[0];
            const Icon = item.icon;
            const active = isActiveItem(to, location.pathname, role);
            return <Link key={to} to={to} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold transition ${active ? "text-orange-600" : "text-slate-500 hover:bg-slate-50"}`} aria-current={active ? "page" : undefined}><Icon className={`h-[18px] w-[18px] ${active ? "text-orange-600" : "text-slate-400"}`} /><span>{mobileLabels[role][index]}</span></Link>;
          })}
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close menu" : "Open more navigation"} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold transition ${mobileMenuOpen ? "bg-orange-50 text-orange-700" : "text-slate-500 hover:bg-slate-50"}`}>{mobileMenuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}<span>More</span></button>
        </div>
      </nav>
      {mobileMenuOpen && <><button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-[61] bg-slate-950/30 lg:hidden" /><section className="fixed inset-x-3 bottom-[76px] z-[62] max-h-[68vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl lg:hidden" aria-label="More workspace links"><div className="mb-3 flex items-center justify-between border-b border-slate-100 px-2 pb-3"><div><p className="text-sm font-extrabold text-slate-900">{workspace.title}</p><p className="mt-0.5 text-xs text-slate-500">{workspace.subtitle}</p></div><button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu"><ChevronDown className="h-4 w-4" /></button></div><div className="space-y-1">{items.map((item) => renderNavItem(item))}</div><button type="button" onClick={() => void handleLogout()} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 pt-3 text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut className="h-[18px] w-[18px]" />Sign out</button></section></>}
    </div>
  );
}
