import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  CircleAlert,
  Info,
  Package,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  Weight,
  X,
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

type FleetFilter = "all" | "priced" | "missing-pricing";

const formatCurrency = (amount?: number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? Number(amount) : 0);

const formatWeight = (amount?: number | null) =>
  `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Number.isFinite(amount) ? Number(amount) : 0
  )} kg`;

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view the vehicle fleet.";
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

function VehicleStat({
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
  const toneClass = {
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  }[tone];

  return (
    <article className={`${cardClass} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClass}`}>
          {icon}
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Fleet
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
}

function RateLine({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-400">{detail}</p>}
      </div>
      <p className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900">{formatCurrency(value)}</p>
    </div>
  );
}

function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // Reuse the existing vehicle read endpoint used by the booking flow.
      const response = await api.get("/vehicles");
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load vehicles.");
      }
      setVehicles(Array.isArray(response.data.vehicles) ? response.data.vehicles : []);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load the vehicle fleet."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const pricedCount = vehicles.filter((vehicle) => Boolean(vehicle.pricing)).length;
  const missingPricingCount = vehicles.length - pricedCount;
  const largestCapacity = vehicles.reduce(
    (largest, vehicle) => Math.max(largest, Number(vehicle.capacityKg) || 0),
    0
  );

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const searchable = [vehicle.name, vehicle.slug, vehicle.description ?? "", ...(vehicle.features ?? [])]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      const matchesFilter =
        filter === "all" ||
        (filter === "priced" && Boolean(vehicle.pricing)) ||
        (filter === "missing-pricing" && !vehicle.pricing);
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
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/admin/pricing" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 sm:inline-flex">
              <BadgeIndianRupee className="h-4 w-4" /> Pricing
            </Link>
            <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-11">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Fleet operations
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Vehicle management</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Review the vehicle types offered on LogiGo, their carrying capacity, supported features and configured fare rates.
            </p>
          </div>
          <button type="button" onClick={() => void loadVehicles(true)} disabled={loading || refreshing} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh fleet"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-rose-800">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="text-sm font-extrabold">Could not load vehicles</p><p className="mt-1 text-sm leading-5">{error}</p></div>
            </div>
            <button type="button" onClick={() => void loadVehicles(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">Try again</button>
          </div>
        )}

        <section aria-label="Fleet summary" className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-4">
          <VehicleStat icon={<Truck className="h-5 w-5" />} label="Vehicle types" value={loading ? "—" : vehicles.length} detail="Returned by the vehicle API" />
          <VehicleStat icon={<CheckCircle2 className="h-5 w-5" />} label="Pricing configured" value={loading ? "—" : pricedCount} detail="Vehicle types with fare rates" tone="emerald" />
          <VehicleStat icon={<CircleAlert className="h-5 w-5" />} label="Pricing missing" value={loading ? "—" : missingPricingCount} detail="Need configuration review" tone={missingPricingCount ? "amber" : "slate"} />
          <VehicleStat icon={<Weight className="h-5 w-5" />} label="Largest capacity" value={loading ? "—" : formatWeight(largestCapacity)} detail="Highest listed load capacity" tone="slate" />
        </section>

        <section className={`${cardClass} mt-6 p-4 sm:mt-7 sm:p-5`} aria-label="Search and filter vehicles">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles, descriptions or features…" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100" />
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All vehicles"],
                ["priced", "Pricing configured"],
                ["missing-pricing", "Missing pricing"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-10 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition sm:text-sm ${filter === value ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Showing <strong className="text-slate-700">{loading ? "—" : filteredVehicles.length}</strong> of {loading ? "—" : vehicles.length} vehicle types</span>
            {search && <button type="button" onClick={() => setSearch("")} className="inline-flex items-center gap-1 font-bold text-orange-700 hover:text-orange-800"><X className="h-3.5 w-3.5" /> Clear search</button>}
          </div>
        </section>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className={`${cardClass} animate-pulse p-5`}><div className="h-40 rounded-2xl bg-slate-100" /><div className="mt-5 h-5 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-6 h-20 rounded-2xl bg-slate-100" /></div>)}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className={`${cardClass} mt-6 flex flex-col items-center px-5 py-14 text-center sm:py-16`}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Truck className="h-7 w-7" /></span>
            <h2 className="mt-4 text-lg font-extrabold text-slate-900">No vehicles found</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Try a different search term or change the pricing filter to see more vehicle types.</p>
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="mt-5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600">Reset filters</button>
          </div>
        ) : (
          <section aria-label="Vehicle fleet list" className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => {
              const pricing = vehicle.pricing;
              return (
                <article key={vehicle._id} className={`${cardClass} flex min-w-0 flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(15,23,42,0.07)]`}>
                  <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-slate-50 to-slate-100">
                    {vehicle.imageUrl ? (
                      <img src={vehicle.imageUrl} alt={vehicle.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-orange-500 shadow-sm ring-1 ring-slate-200/70"><Truck className="h-12 w-12" /></div>
                    )}
                    <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-sm ${pricing ? "border-emerald-200 bg-white/95 text-emerald-700" : "border-amber-200 bg-white/95 text-amber-800"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pricing ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {pricing ? "Pricing configured" : "Pricing missing"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-black tracking-tight text-slate-900">{vehicle.name || "Unnamed vehicle"}</h2>
                        <p className="mt-1 break-all text-xs font-semibold text-slate-400">{vehicle.slug || "Vehicle type"}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-50 px-2.5 py-2 text-xs font-extrabold text-orange-700"><Weight className="h-3.5 w-3.5" /> {formatWeight(vehicle.capacityKg)}</span>
                    </div>
                    {vehicle.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{vehicle.description}</p>}
                    {vehicle.features && vehicle.features.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {vehicle.features.slice(0, 4).map((feature, index) => <span key={`${feature}-${index}`} className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">{feature}</span>)}
                        {vehicle.features.length > 4 && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-500">+{vehicle.features.length - 4} more</span>}
                      </div>
                    ) : <p className="mt-4 text-xs text-slate-400">No feature details available.</p>}

                    {pricing ? (
                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-1">
                        <RateLine label="Base fare" value={pricing.baseFare} />
                        <RateLine label="Distance rate" value={pricing.perKmRate} detail="Per kilometre" />
                        <RateLine label="Weight rate" value={pricing.perKgRate} detail="Per kilogram" />
                        <RateLine label="Service fee" value={pricing.serviceFee} />
                        <div className="-mx-3.5 mt-1 rounded-b-2xl border-t border-orange-100 bg-orange-50 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-orange-800">Minimum fare</span><span className="text-base font-black tabular-nums text-orange-700">{formatCurrency(pricing.minimumFare)}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2.5 text-amber-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-extrabold">Pricing not configured</p><p className="mt-1 text-xs leading-5">Rates are not present in the current vehicle API response.</p></div></div>
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 mt-5">
                      <button type="button" onClick={() => setSelectedVehicle(vehicle)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"><Info className="h-4 w-4" /> Details</button>
                      <Link to="/admin/pricing" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-extrabold text-white transition hover:bg-orange-600"><Settings2 className="h-4 w-4" /> Pricing overview</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <aside className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-blue-950">Vehicle data and changes</p>
            <p className="mt-1 text-sm leading-6 text-blue-900/75">This page displays data returned by the existing <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">GET /vehicles</code> endpoint. Add, edit, activate/deactivate, and delete actions are not enabled because the admin write routes were not verified in the available project context.</p>
          </div>
        </aside>
      </main>

      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedVehicle(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Vehicle details</p><h2 id="vehicle-modal-title" className="mt-2 break-words text-2xl font-black text-slate-950">{selectedVehicle.name}</h2><p className="mt-1 break-all text-sm text-slate-400">{selectedVehicle.slug}</p></div>
              <button type="button" aria-label="Close vehicle details" onClick={() => setSelectedVehicle(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </div>
            {selectedVehicle.imageUrl && <img src={selectedVehicle.imageUrl} alt={selectedVehicle.name} className="mt-5 max-h-56 w-full rounded-2xl bg-slate-50 object-contain" />}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Load capacity</p><p className="mt-1 text-xl font-black text-slate-900">{formatWeight(selectedVehicle.capacityKg)}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Pricing</p><p className={`mt-1 text-xl font-black ${selectedVehicle.pricing ? "text-emerald-700" : "text-amber-700"}`}>{selectedVehicle.pricing ? "Configured" : "Missing"}</p></div>
            </div>
            {selectedVehicle.description && <div className="mt-4"><h3 className="text-sm font-extrabold text-slate-800">Description</h3><p className="mt-1 text-sm leading-6 text-slate-500">{selectedVehicle.description}</p></div>}
            <div className="mt-5"><h3 className="text-sm font-extrabold text-slate-800">Features</h3>
              {selectedVehicle.features?.length ? <div className="mt-2 flex flex-wrap gap-2">{selectedVehicle.features.map((feature, index) => <span key={`${feature}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{feature}</span>)}</div> : <p className="mt-2 text-sm text-slate-400">No feature details available.</p>}
            </div>
            {selectedVehicle.pricing && <div className="mt-5 rounded-2xl border border-slate-200 p-4"><h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900"><Package className="h-4 w-4 text-orange-500" /> Fare configuration</h3><RateLine label="Base fare" value={selectedVehicle.pricing.baseFare} /><RateLine label="Per kilometre" value={selectedVehicle.pricing.perKmRate} /><RateLine label="Per kilogram" value={selectedVehicle.pricing.perKgRate} /><RateLine label="Service fee" value={selectedVehicle.pricing.serviceFee} /><RateLine label="Minimum fare" value={selectedVehicle.pricing.minimumFare} /></div>}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setSelectedVehicle(null)} className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800">Close details</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminVehicles;
