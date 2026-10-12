
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { isAxiosError } from "axios";
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
  IndianRupee,
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

interface RouteLocation {
  address: string;
  longitude: number;
  latitude: number;
}

interface FareEstimate {
  success: boolean;
  message: string;
  route: {
    pickup: RouteLocation;
    drop: RouteLocation;
    distanceKm: number;
    durationMinutes: number;
  };
  vehicle: {
    id: string;
    name: string;
    capacityKg: number;
  };
  package: {
    weightKg: number;
  };
  fare: {
    currency: string;
    baseFare: number;
    distanceCharge: number;
    weightCharge: number;
    serviceFee: number;
    subtotal: number;
    minimumFare: number;
    estimatedFare: number;
  };
}

interface BookingCreateResponse {
  success: boolean;
  message: string;
  booking: {
    _id: string;
    bookingCode: string;
    status: string;
  };
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/10";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo. Check that the backend is running."
        : fallback)
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function BookDelivery() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<string | null>(null);

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [weightKg, setWeightKg] = useState("10");
  const [instructions, setInstructions] = useState("");

  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const [bookingError, setBookingError] = useState("");

  const [isEstimating, setIsEstimating] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);

  useEffect(() => {
    let active = true;

    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        setVehicleError("");

        const response = await api.get("/vehicles");

        if (!response.data.success) {
          throw new Error("Unable to load vehicles.");
        }

        if (active) {
          setVehicles(response.data.vehicles ?? []);
        }
      } catch (error: unknown) {
        if (active) {
          setVehicleError(
            getErrorMessage(error, "Unable to load vehicles.")
          );
        }
      } finally {
        if (active) {
          setLoadingVehicles(false);
        }
      }
    }

    loadVehicles();

    return () => {
      active = false;
    };
  }, []);

  const chosenVehicle = vehicles.find(
    (vehicle) => vehicle._id === selectedVehicle
  );

  const weight = Number(weightKg);

  const validWeight =
    Number.isFinite(weight) &&
    weight > 0 &&
    weight <= 5000;

  const canEstimate =
    pickup.trim().length >= 3 &&
    drop.trim().length >= 3 &&
    packageDescription.trim().length >= 2 &&
    validWeight &&
    Boolean(chosenVehicle?.pricing) &&
    weight <= (chosenVehicle?.capacityKg ?? 0) &&
    !loadingVehicles &&
    !isEstimating &&
    !isCreatingBooking;

  const invalidateEstimate = () => {
    setEstimate(null);
    setEstimateError("");
    setBookingError("");
  };

  async function handleEstimate() {
    if (!canEstimate || !selectedVehicle) return;

    setIsEstimating(true);
    setEstimate(null);
    setEstimateError("");
    setBookingError("");

    try {
      const response = await api.post("/pricing/estimate", {
        pickupAddress: pickup.trim(),
        dropAddress: drop.trim(),
        vehicleId: selectedVehicle,
        weightKg: weight,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Fare estimation failed."
        );
      }

      setEstimate(response.data as FareEstimate);
    } catch (error: unknown) {
      setEstimateError(
        getErrorMessage(error, "Unable to estimate the fare.")
      );
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleConfirmBooking() {
    if (!estimate || !selectedVehicle || isCreatingBooking) {
      return;
    }

    setIsCreatingBooking(true);
    setBookingError("");

    try {
      // Only send user-entered booking details.
      // The backend revalidates the vehicle, route and fare.
      const response = await api.post<BookingCreateResponse>(
        "/bookings",
        {
          pickupAddress: pickup.trim(),
          dropAddress: drop.trim(),
          vehicleId: selectedVehicle,
          weightKg: weight,
          packageDescription: packageDescription.trim(),
          specialInstructions: instructions.trim(),
        }
      );

      if (
        !response.data.success ||
        !response.data.booking?._id
      ) {
        throw new Error(
          response.data.message || "Booking could not be created."
        );
      }

      navigate(
        `/customer/orders/${response.data.booking._id}`,
        {
          state: {
            bookingCode: response.data.booking.bookingCode,
          },
        }
      );
    } catch (error: unknown) {
      setBookingError(
        getErrorMessage(
          error,
          "Unable to create the booking. Please try again."
        )
      );
    } finally {
      setIsCreatingBooking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            On-demand transportation
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Book your delivery
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Enter your delivery details, choose a suitable vehicle,
            and calculate your estimated fare.
          </p>
        </motion.div>

        <div className="mt-9 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
              1
            </span>
            <span className="hidden sm:inline">Delivery details</span>
          </div>

          <div className="h-px flex-1 bg-white/10" />

          <div
            className={`flex items-center gap-2 text-sm ${
              estimate ? "text-orange-400" : "text-slate-500"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10">
              {estimate ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </span>
            <span className="hidden sm:inline">Fare estimate</span>
          </div>

          <div className="h-px flex-1 bg-white/10" />

          <div
            className={`flex items-center gap-2 text-sm ${
              estimate ? "text-orange-400" : "text-slate-500"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10">
              3
            </span>
            <span className="hidden sm:inline">Confirmation</span>
          </div>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* Pickup and drop */}
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
                    Enter complete addresses, including city.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5">
                <div>
                  <label htmlFor="pickup" className="mb-2 block text-sm font-semibold text-slate-300">
                    Pickup location
                  </label>

                  <input
                    id="pickup"
                    value={pickup}
                    onChange={(event) => {
                      setPickup(event.target.value);
                      invalidateEstimate();
                    }}
                    placeholder="e.g. Shaniwar Wada, Pune"
                    className={inputClass}
                    autoComplete="street-address"
                    maxLength={256}
                    required
                  />
                </div>

                <div className="flex items-center gap-3 pl-2 text-slate-600">
                  <div className="h-6 w-px border-l border-dashed border-white/20" />
                  <span className="text-xs">Delivery route</span>
                </div>

                <div>
                  <label htmlFor="drop" className="mb-2 block text-sm font-semibold text-slate-300">
                    Drop location
                  </label>

                  <input
                    id="drop"
                    value={drop}
                    onChange={(event) => {
                      setDrop(event.target.value);
                      invalidateEstimate();
                    }}
                    placeholder="e.g. Pune Railway Station, Pune"
                    className={inputClass}
                    autoComplete="street-address"
                    maxLength={256}
                    required
                  />
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0b1728]">
                  <div className="relative flex h-14 items-center justify-center">
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
                    Driving distance is calculated when you request
                    a fare estimate.
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
                  <h2 className="text-xl font-bold">Package details</h2>
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
                    onChange={(event) => {
                      setPackageDescription(event.target.value);
                      invalidateEstimate();
                    }}
                    placeholder="e.g. Carton boxes, furniture"
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
                    Weight (kg)
                  </label>

                  <input
                    id="weightKg"
                    type="number"
                    value={weightKg}
                    onChange={(event) => {
                      setWeightKg(event.target.value);
                      invalidateEstimate();
                    }}
                    className={inputClass}
                    min="0.1"
                    max="5000"
                    step="0.1"
                    required
                  />

                  {!validWeight && weightKg !== "" && (
                    <p className="mt-2 text-xs text-red-300">
                      Enter a weight from 0.1 to 5000 kg.
                    </p>
                  )}
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
                    onChange={(event) => {
                      setInstructions(event.target.value);
                      invalidateEstimate();
                    }}
                    placeholder="Optional"
                    className={inputClass}
                    maxLength={500}
                  />
                </div>
              </div>
            </section>

            {/* Vehicle selection */}
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Choose your vehicle</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Vehicles and rates come from MongoDB.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Live catalog
                </div>
              </div>

              {loadingVehicles && (
                <div className="mt-7 text-sm text-slate-400">
                  Loading available vehicles...
                </div>
              )}

              {vehicleError && !loadingVehicles && (
                <div role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                  <p className="text-sm text-red-300">{vehicleError}</p>

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

              {!loadingVehicles && !vehicleError && vehicles.length === 0 && (
                <p className="mt-6 text-sm text-slate-400">
                  No vehicles are available right now.
                </p>
              )}

              {!loadingVehicles && !vehicleError && vehicles.length > 0 && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {vehicles.map((vehicle, index) => {
                    const isSelected = selectedVehicle === vehicle._id;
                    const canCarry =
                      validWeight && weight <= vehicle.capacityKg;
                    const canSelect =
                      canCarry && Boolean(vehicle.pricing);

                    return (
                      <motion.article
                        key={vehicle._id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className={`relative flex flex-col rounded-2xl border p-5 transition ${
                          isSelected
                            ? "border-orange-400 bg-orange-400/[0.07]"
                            : "border-white/10 bg-[#0b1728] hover:border-white/20"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-orange-400" />
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
                          Up to {vehicle.capacityKg.toLocaleString("en-IN")} kg
                        </div>

                        <div className="mt-4 space-y-2">
                          {(vehicle.features ?? []).map((feature) => (
                            <div key={feature} className="text-xs text-slate-400">
                              <span className="mr-2 text-emerald-400">✓</span>
                              {feature}
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto pt-6">
                          {vehicle.pricing && (
                            <div className="mb-4 rounded-xl border border-white/5 bg-black/10 p-3">
                              <p className="text-xs text-slate-500">Minimum fare</p>
                              <p className="mt-1 text-xl font-black">
                                {formatPrice(vehicle.pricing.minimumFare)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatPrice(vehicle.pricing.perKmRate)} per km
                              </p>
                            </div>
                          )}

                          {!canCarry && (
                            <p className="mb-3 text-xs text-amber-300">
                              This vehicle cannot carry the entered weight.
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={!canSelect}
                            onClick={() => {
                              setSelectedVehicle(vehicle._id);
                              invalidateEstimate();
                            }}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? "bg-orange-400 text-slate-950"
                                : "bg-white/5 text-white hover:bg-orange-500"
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

          {/* Summary */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-400/10 p-3">
                  <Package className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Booking summary</h2>
                  <p className="text-xs text-slate-500">
                    Review your delivery details
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
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="mt-1 text-slate-200">
                      {weightKg ? `${weightKg} kg` : "Not entered"}
                    </p>
                  </div>
                </div>
              </div>

              {estimate && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Fare estimate ready
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Estimated delivery fare
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {formatPrice(estimate.fare.estimatedFare)}
                  </p>

                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Distance</span>
                      <span>{estimate.route.distanceKm} km</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Driving time</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {estimate.route.durationMinutes} min
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Base fare</span>
                      <span>{formatPrice(estimate.fare.baseFare)}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Distance charge</span>
                      <span>{formatPrice(estimate.fare.distanceCharge)}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Weight charge</span>
                      <span>{formatPrice(estimate.fare.weightCharge)}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Service fee</span>
                      <span>{formatPrice(estimate.fare.serviceFee)}</span>
                    </div>

                    <div className="flex justify-between gap-3 border-t border-white/10 pt-3 font-bold">
                      <span>Estimated total</span>
                      <span className="text-emerald-300">
                        {formatPrice(estimate.fare.estimatedFare)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {estimateError && (
                <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
                  {estimateError}
                </div>
              )}

              {bookingError && (
                <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">
                  {bookingError}
                </div>
              )}

              {!estimate ? (
                <button
                  type="button"
                  disabled={!canEstimate}
                  onClick={handleEstimate}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isEstimating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Calculating fare...
                    </>
                  ) : (
                    <>
                      Calculate estimated fare
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCreatingBooking}
                  onClick={handleConfirmBooking}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingBooking ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating booking...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {estimate && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Confirming rechecks the route and fare on the server.
                </p>
              )}

              {!chosenVehicle && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Select a vehicle to continue.
                </p>
              )}

              <p className="mt-3 text-center text-xs text-slate-600">
                {estimate
                  ? "No payment is collected at this stage."
                  : "Calculate your fare before confirming the booking."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BookDelivery;
