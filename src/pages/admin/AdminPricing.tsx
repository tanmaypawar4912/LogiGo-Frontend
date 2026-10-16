import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  Wallet,
  Weight,
  Route,
} from "lucide-react";

import api from "../../services/api";

interface VehiclePricing {
  baseFare: number;
  perKmRate: number;
  perKgRate: number;
  minimumFare: number;
  serviceFee: number;
}

interface Vehicle {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  capacityKg: number;
  imageUrl?: string | null;
  features?: string[];
  pricing: VehiclePricing | null;
}

type PricingFilter = "all" | "configured" | "missing";

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? Number(amount) : 0);

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view vehicle pricing.";
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

const cardClass =
  "rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.035)]";

function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "orange",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: "orange" | "emerald" | "amber" | "slate";
}) {
  const toneClasses = {
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  }[tone];

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{value}</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneClasses}`}>
          {icon}
        </span>
      </div>
    </section>
  );
}

function PriceItem({ label, amount, note }: { label: string; amount: number; note?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
      </div>
      <p className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900">{formatCurrency(amount)}</p>
    </div>
  );
}

function AdminPricing() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PricingFilter>("all");

  const loadVehicles = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // This read endpoint is also used by the customer booking flow.
      const response = await api.get("/vehicles");
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load vehicle pricing.");
      }
      setVehicles(Array.isArray(response.data.vehicles) ? response.data.vehicles : []);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load vehicle pricing."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const configuredCount = vehicles.filter((vehicle) => Boolean(vehicle.pricing)).length;
  const missingCount = vehicles.length - configuredCount;
  const averageMinimum = useMemo(() => {
    const configured = vehicles.filter((vehicle) => vehicle.pricing);
    if (!configured.length) return null;
    return configured.reduce((sum, vehicle) => sum + (vehicle.pricing?.minimumFare ?? 0), 0) / configured.length;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch = !term ||
        vehicle.name?.toLowerCase().includes(term) ||
        vehicle.slug?.toLowerCase().includes(term) ||
        vehicle.description?.toLowerCase().includes(term);
      const matchesFilter = filter === "all" ||
        (filter === "configured" && Boolean(vehicle.pricing)) ||
        (filter === "missing" && !vehicle.pricing);
      return matchesSearch && matchesFilter;
    });
  }, [vehicles, search, filter]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
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
          <Link to="/admin" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.19em] text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Revenue &amp; rates
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Pricing overview</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Review the fare structure configured for each delivery vehicle, including base fare, distance, weight, and service fees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadVehicles(true)}
            disabled={refreshing || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh rates"}
          </button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Truck className="h-5 w-5" />} label="Vehicle types" value={loading ? "—" : vehicles.length} detail="Available in the booking flow" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Pricing configured" value={loading ? "—" : configuredCount} detail="Vehicle types with fare settings" tone="emerald" />
          <StatCard icon={<CircleAlert className="h-5 w-5" />} label="Missing pricing" value={loading ? "—" : missingCount} detail="Need a pricing configuration" tone="amber" />
          <StatCard icon={<Wallet className="h-5 w-5" />} label="Average minimum fare" value={loading || averageMinimum === null ? "—" : formatCurrency(averageMinimum)} detail="Across configured vehicle types" tone="slate" />
        </div>

        <section className={`${cardClass} mt-7 overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Vehicle fare settings</h2>
              <p className="mt-1 text-sm text-slate-500">{loading ? "Loading vehicle rates…" : `${filteredVehicles.length} of ${vehicles.length} vehicle types`}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="relative block min-w-0 flex-1 lg:w-72">
                <span className="sr-only">Search vehicle pricing</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle types…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </label>
              <label className="block sm:w-48">
                <span className="sr-only">Filter pricing status</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value as PricingFilter)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                  <option value="all">All pricing</option>
                  <option value="configured">Configured</option>
                  <option value="missing">Missing pricing</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div role="alert" className="m-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:m-5">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1"><p className="font-bold">Could not load pricing</p><p className="mt-1 leading-6">{error}</p></div>
              <button type="button" onClick={() => void loadVehicles()} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 font-bold hover:bg-rose-100">Retry</button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="animate-pulse rounded-2xl border border-slate-100 p-5"><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="mt-4 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-6 space-y-3"><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-100" /><div className="h-4 rounded bg-slate-100" /></div></div>)}
            </div>
          ) : !error && filteredVehicles.length === 0 ? (
            <div className="px-5 py-16 text-center sm:py-20">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-6 w-6" /></span>
              <h3 className="mt-4 text-base font-extrabold text-slate-900">No vehicles found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Try another search term or change the pricing filter.</p>
              <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">Clear filters</button>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
              {filteredVehicles.map((vehicle) => {
                const pricing = vehicle.pricing;
                return (
                  <article key={vehicle._id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-md sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                        {vehicle.imageUrl ? <img src={vehicle.imageUrl} alt={vehicle.name} className="h-full w-full object-cover" loading="lazy" /> : <Truck className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-extrabold text-slate-900">{vehicle.name || "Unnamed vehicle"}</h3>
                        <p className="mt-1 break-words text-xs text-slate-500">{vehicle.slug || "Vehicle type"} · Capacity {Number(vehicle.capacityKg || 0).toLocaleString("en-IN")} kg</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-extrabold ${pricing ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pricing ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {pricing ? "Configured" : "Missing"}
                      </span>
                    </div>

                    {vehicle.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">{vehicle.description}</p>}

                    {pricing ? (
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-1">
                        <PriceItem label="Base fare" amount={pricing.baseFare} />
                        <PriceItem label="Distance rate" amount={pricing.perKmRate} note="Per kilometre" />
                        <PriceItem label="Weight rate" amount={pricing.perKgRate} note="Per kilogram" />
                        <PriceItem label="Service fee" amount={pricing.serviceFee} />
                        <div className="-mx-3.5 mt-1 rounded-b-xl border-t border-orange-100 bg-orange-50 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-orange-800">Minimum fare</span><span className="text-base font-black tabular-nums text-orange-700">{formatCurrency(pricing.minimumFare)}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2.5 text-amber-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-extrabold">Pricing not configured</p><p className="mt-1 text-xs leading-5">A fare configuration is not available for this vehicle in the current API response.</p></div></div>
                      </div>
                    )}
                    <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400"><Settings2 className="h-3.5 w-3.5" /> {pricing ? "Rates currently returned by the vehicle API" : "Requires configuration review"}</div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-blue-950">About these rates</p>
            <p className="mt-1 text-sm leading-6 text-blue-900/75">This page displays vehicle pricing returned by the existing <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">GET /vehicles</code> endpoint. Fare estimation is handled separately by the backend. Editing and saving rates is not enabled here because a verified admin pricing-update endpoint was not available in the supplied project context.</p>
          </div>
        </aside>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5"><BadgeIndianRupee className="h-3.5 w-3.5" /> Currency: INR</span>
          <span className="inline-flex items-center gap-1.5"><Route className="h-3.5 w-3.5" /> Distance-based charge</span>
          <span className="inline-flex items-center gap-1.5"><Weight className="h-3.5 w-3.5" /> Weight-based charge</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Refresh to load latest rates</span>
        </div>
      </main>
    </div>
  );
}

export default AdminPricing;
