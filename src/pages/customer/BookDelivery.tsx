
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  Weight,
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
  description: string;
  capacityKg: number;
  imageUrl?: string | null;
  features: string[];
  pricing: VehiclePricing | null;
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/10";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function BookDelivery() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [packageDescription, setPackageDescription] =
    useState("");
  const [weightKg, setWeightKg] = useState("10");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    let active = true;

    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/vehicles");

        if (!response.data.success) {
          throw new Error("Unable to load vehicles.");
        }

        if (active) {
          setVehicles(response.data.vehicles ?? []);
        }
      } catch (err: unknown) {
        if (!active) return;

        const message =
          err instanceof Error
            ? err.message
            : "Could not load vehicles.";

        setError(
          message === "Network Error"
            ? "Could not connect to LogiGo API. Check that the backend is running."
            : message
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchVehicles();

    return () => {
      active = false;
    };
  }, []);

  const chosenVehicle = vehicles.find(
    (vehicle) => vehicle._id === selectedVehicle
  );

  const weight = Number(weightKg);

  const canContinue =
    Boolean(pickup.trim()) &&
    Boolean(drop.trim()) &&
    Boolean(packageDescription.trim()) &&
    Number.isFinite(weight) &&
    weight > 0 &&
    Boolean(chosenVehicle) &&
    weight <= (chosenVehicle?.capacityKg ?? 0);

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/customer" className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500 p-2.5">
              <Truck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-black">LogiGo</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                Customer booking
              </p>
            </div>
          </Link>

          <Link
            to="/customer"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        {/* Page introduction */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            On-demand transportation
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Book your delivery
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Enter your delivery details, choose a vehicle that
            matches your cargo, and continue to the fare
            estimation step.
          </p>
        </motion.div>

        {/* Progress indicator */}
        <div className="mt-9 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
              1
            </span>
            <span className="hidden sm:inline">Delivery details</span>
          </div>

          <div className="h-px flex-1 bg-white/10" />

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10">
              2
            </span>
            <span className="hidden sm:inline">Fare estimate</span>
          </div>

          <div className="h-px flex-1 bg-white/10" />

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10">
              3
            </span>
            <span className="hidden sm:inline">Confirm</span>
          </div>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main form */}
          <div className="space-y-8">
            {/* Route */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-400/10 p-3">
                  <MapPin className="h-5 w-5 text-orange-400" />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Where are we moving?
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provide pickup and destination addresses.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5">
                <div>
                  <label
                    htmlFor="pickup"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Pickup location
                  </label>

                  <input
                    id="pickup"
                    value={pickup}
                    onChange={(event) => setPickup(event.target.value)}
                    placeholder="Enter pickup address"
                    className={inputClass}
                    autoComplete="street-address"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 pl-2 text-slate-600">
                  <div className="h-6 w-px border-l border-dashed border-white/20" />
                  <span className="text-xs">
                    Delivery route
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="drop"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Drop location
                  </label>

                  <input
                    id="drop"
                    value={drop}
                    onChange={(event) => setDrop(event.target.value)}
                    placeholder="Enter destination address"
                    className={inputClass}
                    autoComplete="street-address"
                    required
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0b1728]">
                  <div className="logistics-road relative flex h-14 items-center justify-center">
                    <div className="road-lines absolute inset-0 opacity-50" />

                    <motion.div
                      animate={{ x: [-65, 65] }}
                      transition={{
                        duration: 3,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="relative z-10 rounded-xl bg-orange-500 p-2 shadow-lg shadow-orange-500/20"
                    >
                      <Truck className="h-5 w-5" />
                    </motion.div>
                  </div>

                  <p className="px-4 py-3 text-xs text-slate-500">
                    Animated route preview. Map directions and
                    actual distance will be integrated in the
                    next step.
                  </p>
                </div>
              </div>
            </section>

            {/* Package */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-400/10 p-3">
                  <Package className="h-5 w-5 text-orange-400" />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Package details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tell us what you need to transport.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="packageDescription"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Item description
                  </label>

                  <input
                    id="packageDescription"
                    value={packageDescription}
                    onChange={(event) =>
                      setPackageDescription(event.target.value)
                    }
                    placeholder="e.g. Boxes, furniture, office supplies"
                    className={inputClass}
                    maxLength={300}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="weightKg"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <Weight className="h-4 w-4 text-slate-500" />
                    Package weight (kg)
                  </label>

                  <input
                    id="weightKg"
                    type="number"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className={inputClass}
                    min="0.1"
                    step="0.1"
                    max="5000"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="instructions"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Special instructions
                  </label>

                  <input
                    id="instructions"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                    maxLength={500}
                  />
                </div>
              </div>
            </section>

            {/* Vehicle catalog */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Choose your vehicle
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a vehicle that can carry your load.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Live catalog
                </div>
              </div>

              {loading && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-white/10 p-5"
                    >
                      <div className="h-12 w-12 rounded-xl bg-white/10" />
                      <div className="mt-5 h-4 w-2/3 rounded bg-white/10" />
                      <div className="mt-3 h-3 w-full rounded bg-white/5" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
                      <div className="mt-6 h-10 rounded-xl bg-white/10" />
                    </div>
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                  <p className="text-sm text-red-300">{error}</p>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && vehicles.length === 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 p-6 text-center">
                  <Truck className="mx-auto h-8 w-8 text-slate-500" />

                  <p className="mt-3 font-semibold">
                    No vehicles available
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Please try again later.
                  </p>
                </div>
              )}

              {!loading && !error && vehicles.length > 0 && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {vehicles.map((vehicle, index) => {
                    const isSelected =
                      selectedVehicle === vehicle._id;

                    const canCarry =
                      Number.isFinite(weight) &&
                      weight > 0 &&
                      weight <= vehicle.capacityKg;

                    return (
                      <motion.article
                        key={vehicle._id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className={`relative flex flex-col rounded-2xl border p-5 transition ${
                          isSelected
                            ? "border-orange-400 bg-orange-400/[0.07] shadow-lg shadow-orange-500/5"
                            : "border-white/10 bg-[#0b1728] hover:border-white/20"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3">
                            <CheckCircle2 className="h-5 w-5 text-orange-400" />
                          </div>
                        )}

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
                          <Truck className="h-7 w-7 text-orange-400" />
                        </div>

                        <h3 className="mt-5 text-lg font-bold">
                          {vehicle.name}
                        </h3>

                        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                          {vehicle.description}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                          <Weight className="h-4 w-4 text-orange-400" />
                          Up to{" "}
                          {vehicle.capacityKg.toLocaleString("en-IN")} kg
                        </div>

                        <div className="mt-4 space-y-2">
                          {(vehicle.features ?? []).map((feature) => (
                            <div
                              key={feature}
                              className="text-xs text-slate-400"
                            >
                              <span className="mr-2 text-emerald-400">
                                ✓
                              </span>
                              {feature}
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto pt-6">
                          {vehicle.pricing ? (
                            <div className="mb-4 rounded-xl border border-white/5 bg-black/10 p-3">
                              <p className="text-xs text-slate-500">
                                Starting/minimum fare
                              </p>

                              <p className="mt-1 text-xl font-black text-white">
                                {formatPrice(vehicle.pricing.minimumFare)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatPrice(vehicle.pricing.perKmRate)} per km
                              </p>
                            </div>
                          ) : (
                            <p className="mb-4 text-xs text-amber-300">
                              Pricing is currently unavailable.
                            </p>
                          )}

                          {!canCarry && weightKg !== "" && (
                            <p className="mb-3 text-xs text-amber-300">
                              This vehicle cannot carry the entered weight.
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={!canCarry || !vehicle.pricing}
                            onClick={() => setSelectedVehicle(vehicle._id)}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? "bg-orange-400 text-slate-950"
                                : "bg-white/5 text-white hover:bg-orange-500 hover:text-white"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select vehicle"}

                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <ArrowRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Order summary */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-400/10 p-3">
                  <Package className="h-5 w-5 text-orange-400" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Booking summary
                  </h2>

                  <p className="text-xs text-slate-500">
                    Current selections
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-white/10" />

              <div className="space-y-5 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Pickup</p>
                    <p className="mt-1 break-words text-slate-200">
                      {pickup.trim() || "Not selected"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Drop</p>
                    <p className="mt-1 break-words text-slate-200">
                      {drop.trim() || "Not selected"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-500">Vehicle</p>
                    <p className="mt-1 text-slate-200">
                      {chosenVehicle?.name || "Choose a vehicle"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Weight className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-500">Package weight</p>
                    <p className="mt-1 text-slate-200">
                      {weightKg ? `${weightKg} kg` : "Not entered"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-6 border-t border-white/10" />

              <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.05] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-300">
                  <Clock3 className="h-4 w-4" />
                  Fare estimation is next
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Final estimated fare requires a verified route distance
                  and server-side calculation. The vehicle's minimum fare
                  is not your final trip price.
                </p>
              </div>

              <button
                type="button"
                disabled={!canContinue}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  if (!canContinue) return;

                  window.alert(
                    "Vehicle and delivery details are selected. The next development step is route distance and fare estimation."
                  );
                }}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="mt-3 text-center text-xs text-slate-600">
                Booking is not submitted at this stage.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BookDelivery;
