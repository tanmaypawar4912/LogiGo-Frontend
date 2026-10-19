import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { isAxiosError } from "axios";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  Weight,
  Wallet,
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

const fieldClass =
  "mt-2.5 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

const cardClass =
  "rounded-3xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]";

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[clamp(1.05rem,2vw,1.3rem)] font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function BookDelivery() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
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

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    setVehicleError("");

    try {
      const response = await api.get("/vehicles");
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load vehicles.");
      }

      setVehicles(response.data.vehicles ?? []);
    } catch (error: unknown) {
      setVehicleError(getErrorMessage(error, "Unable to load vehicles."));
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const chosenVehicle = vehicles.find(
    (vehicle) => vehicle._id === selectedVehicle
  );

  const weight = Number(weightKg);
  const validWeight =
    Number.isFinite(weight) && weight > 0 && weight <= 5000;

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
        throw new Error(response.data.message || "Fare estimation failed.");
      }

      setEstimate(response.data as FareEstimate);
    } catch (error: unknown) {
      setEstimateError(getErrorMessage(error, "Unable to estimate the fare."));
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleConfirmBooking() {
    if (!estimate || !selectedVehicle || isCreatingBooking) return;

    setIsCreatingBooking(true);
    setBookingError("");

    try {
      // Send user-entered booking details only. The backend recalculates
      // and validates the vehicle, route and fare before saving the booking.
      const response = await api.post<BookingCreateResponse>("/bookings", {
        pickupAddress: pickup.trim(),
        dropAddress: drop.trim(),
        vehicleId: selectedVehicle,
        weightKg: weight,
        packageDescription: packageDescription.trim(),
        specialInstructions: instructions.trim(),
      });

      if (!response.data.success || !response.data.booking?._id) {
        throw new Error(
          response.data.message || "Booking could not be created."
        );
      }

      navigate(`/customer/orders/${response.data.booking._id}`, {
        state: { bookingCode: response.data.booking.bookingCode },
      });
    } catch (error: unknown) {
      setBookingError(
        getErrorMessage(error, "Unable to create the booking. Please try again.")
      );
    } finally {
      setIsCreatingBooking(false);
    }
  }

  return (
    <div className="w-full min-w-0 bg-[#F8FAFC] text-slate-900">

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-r from-white via-white to-orange-50/80 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.035)] sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full border border-orange-100/80" />
          <div className="pointer-events-none absolute -right-2 -top-14 h-44 w-44 rounded-full bg-orange-100/40 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700 shadow-sm sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              On-demand transportation
            </div>

            <h1 className="mt-5 text-[clamp(2rem,5.5vw,3.65rem)] font-black leading-[1.04] tracking-[-0.045em] text-slate-950">
              Book your delivery
              <span className="mt-1 block text-orange-500">without the guesswork.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Enter your route, choose the vehicle that fits your cargo and review
              your server-calculated fare before confirming your booking.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Server-verified fare</span>
              <span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-orange-500" /> Route-based estimate</span>
              <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-500" /> No payment at this step</span>
            </div>
          </div>
        </motion.div>

        {/* Responsive step indicator */}
        <div className="mx-auto mt-7 grid max-w-4xl grid-cols-3 gap-2 sm:mt-9 sm:gap-4">
          {[
            { number: "01", label: "Delivery details", complete: true },
            { number: "02", label: "Fare estimate", complete: Boolean(estimate) },
            { number: "03", label: "Confirmation", complete: false },
          ].map((step, index) => (
            <div key={step.number} className="relative min-w-0">
              {index > 0 && (
                <div className={`absolute -left-2.5 top-5 hidden h-px w-5 sm:block ${step.complete ? "bg-orange-300" : "bg-slate-200"}`} />
              )}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold sm:h-10 sm:w-10 ${step.complete ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "border border-slate-200 bg-white text-slate-500"}`}>
                  {step.complete && index === 1 ? <Check className="h-4 w-4" /> : step.number}
                </span>
                <span className={`min-w-0 text-[10px] font-bold leading-4 sm:text-sm ${step.complete ? "text-slate-900" : "text-slate-400"}`}>
                  {step.label}
                </span>
              </div>
              <div className={`mt-3 h-1 rounded-full sm:mt-4 ${step.complete ? "bg-orange-500" : "bg-slate-200"}`} />
            </div>
          ))}
        </div>

        <div className="mt-7 grid items-start gap-6 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_370px] xl:gap-8">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            {/* Pickup and drop */}
            <section className={`${cardClass} p-5 sm:p-7 lg:p-8`}>
              <SectionHeading
                icon={<MapPin className="h-5 w-5" />}
                title="Where are we moving?"
                description="Add complete pickup and destination addresses, including city."
              />

              <div className="mt-7 grid gap-5 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
                  <label htmlFor="pickup" className="text-sm font-bold text-slate-700">
                    Pickup location <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    <input
                      id="pickup"
                      value={pickup}
                      onChange={(event) => { setPickup(event.target.value); invalidateEstimate(); }}
                      placeholder="e.g. Shaniwar Wada, Pune"
                      className={`${fieldClass} pl-10`}
                      autoComplete="street-address"
                      maxLength={256}
                      required
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label htmlFor="drop" className="text-sm font-bold text-slate-700">
                    Drop location <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
                    <input
                      id="drop"
                      value={drop}
                      onChange={(event) => { setDrop(event.target.value); invalidateEstimate(); }}
                      placeholder="e.g. Pune Railway Station, Pune"
                      className={`${fieldClass} pl-10`}
                      autoComplete="street-address"
                      maxLength={256}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/70 via-white to-white">
                <div className="relative flex h-[90px] items-center overflow-hidden sm:h-[108px]">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t-2 border-dashed border-orange-200" />
                  <div className="absolute left-5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white shadow-sm sm:left-8">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <motion.div
                    animate={prefersReducedMotion ? undefined : { x: [0, 12, 0], y: [0, -3, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-[38%] z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25 sm:left-[43%] sm:h-14 sm:w-14"
                  >
                    <Truck className="h-6 w-6 sm:h-7 sm:w-7" />
                  </motion.div>
                  <div className="absolute right-5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-white shadow-sm sm:right-8">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="absolute bottom-3 left-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:left-8 sm:text-xs">Pickup</span>
                  <span className="absolute bottom-3 right-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:right-8 sm:text-xs">Destination</span>
                </div>
                <p className="border-t border-orange-100/80 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
                  Route distance and estimated travel time are calculated when you request a fare estimate.
                </p>
              </div>
            </section>

            {/* Package details */}
            <section className={`${cardClass} p-5 sm:p-7 lg:p-8`}>
              <SectionHeading
                icon={<Package className="h-5 w-5" />}
                title="Package details"
                description="Tell us what the driver will be transporting."
              />

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="packageDescription" className="text-sm font-bold text-slate-700">
                    Item description <span className="text-orange-500">*</span>
                  </label>
                  <input
                    id="packageDescription"
                    value={packageDescription}
                    onChange={(event) => { setPackageDescription(event.target.value); invalidateEstimate(); }}
                    placeholder="e.g. Carton boxes, furniture, office supplies"
                    className={fieldClass}
                    maxLength={300}
                    required
                  />
                </div>

                <div className="min-w-0">
                  <label htmlFor="weightKg" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Weight className="h-4 w-4 text-orange-500" /> Package weight (kg) <span className="text-orange-500">*</span>
                  </label>
                  <input
                    id="weightKg"
                    type="number"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(event) => { setWeightKg(event.target.value); invalidateEstimate(); }}
                    className={fieldClass}
                    min="0.1"
                    max="5000"
                    step="0.1"
                    required
                  />
                  {!validWeight && weightKg !== "" && (
                    <p className="mt-2 text-xs font-medium text-red-600">Enter a weight from 0.1 to 5000 kg.</p>
                  )}
                </div>

                <div className="min-w-0">
                  <label htmlFor="instructions" className="text-sm font-bold text-slate-700">
                    Special instructions <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="instructions"
                    value={instructions}
                    onChange={(event) => { setInstructions(event.target.value); invalidateEstimate(); }}
                    placeholder="e.g. Handle with care"
                    className={fieldClass}
                    maxLength={500}
                  />
                </div>
              </div>
            </section>

            {/* Vehicle selection */}
            <section className={`${cardClass} p-5 sm:p-7 lg:p-8`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  icon={<Truck className="h-5 w-5" />}
                  title="Choose your vehicle"
                  description="Vehicle options and pricing come from the live catalog."
                />
                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Live catalog
                </span>
              </div>

              {loadingVehicles && (
                <div className="mt-7 flex items-center gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin text-orange-500" />
                  Loading available vehicles...
                </div>
              )}

              {vehicleError && !loadingVehicles && (
                <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm text-red-700">{vehicleError}</p>
                  <button
                    type="button"
                    onClick={() => void loadVehicles()}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </div>
              )}

              {!loadingVehicles && !vehicleError && vehicles.length === 0 && (
                <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                  No vehicles are available right now.
                </p>
              )}

              {!loadingVehicles && !vehicleError && vehicles.length > 0 && (
                <div className="mt-7 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {vehicles.map((vehicle, index) => {
                    const isSelected = selectedVehicle === vehicle._id;
                    const canCarry = validWeight && weight <= vehicle.capacityKg;
                    const canSelect = canCarry && Boolean(vehicle.pricing);

                    return (
                      <motion.article
                        key={vehicle._id}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : index * 0.07, duration: 0.3 }}
                        className={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 transition duration-200 sm:p-5 ${isSelected ? "border-orange-400 bg-orange-50/60 shadow-[0_8px_25px_rgba(249,115,22,0.10)] ring-2 ring-orange-100" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-slate-900/[0.035]"}`}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
                            <Check className="h-4 w-4" />
                          </span>
                        )}

                        <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 via-slate-50 to-white sm:h-32">
                          {vehicle.imageUrl ? (
                            <img
                              src={vehicle.imageUrl}
                              alt={vehicle.name}
                              loading="lazy"
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm ring-1 ring-slate-100">
                              <Truck className="h-9 w-9" />
                            </div>
                          )}
                        </div>

                        <h3 className="mt-5 pr-7 text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                          {vehicle.name}
                        </h3>
                        <p className="mt-2 min-h-[3.25rem] text-xs leading-5 text-slate-500 sm:text-sm">
                          {vehicle.description}
                        </p>

                        <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Weight className="h-4 w-4 text-orange-500" />
                          Up to {vehicle.capacityKg.toLocaleString("en-IN")} kg
                        </div>

                        <div className="mt-4 space-y-2">
                          {(vehicle.features ?? []).map((feature) => (
                            <div key={feature} className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto pt-5">
                          {vehicle.pricing && (
                            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                              <p className="text-[11px] font-semibold text-slate-500">Minimum fare</p>
                              <p className="mt-1 text-xl font-black tracking-tight text-slate-900">
                                {formatPrice(vehicle.pricing.minimumFare)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatPrice(vehicle.pricing.perKmRate)} per km
                              </p>
                            </div>
                          )}

                          {!canCarry && (
                            <p className="mb-3 text-xs font-medium leading-5 text-amber-700">
                              This vehicle cannot carry the entered package weight.
                            </p>
                          )}
                          {!vehicle.pricing && (
                            <p className="mb-3 text-xs font-medium leading-5 text-amber-700">
                              Pricing is not configured for this vehicle yet.
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={!canSelect}
                            onClick={() => { setSelectedVehicle(vehicle._id); invalidateEstimate(); }}
                            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ${isSelected ? "bg-orange-500 text-white shadow-md shadow-orange-500/15 hover:bg-orange-600" : "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"}`}
                          >
                            {isSelected ? "Selected" : "Select vehicle"}
                            {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Booking summary: sticky on desktop, normal flow on mobile */}
          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/80 to-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/15">
                    <Package className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">Booking summary</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Review your delivery details</p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-400">Pickup</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-700">{pickup.trim() || "Not selected"}</p>
                    </div>
                  </div>
                  <div className="ml-[7px] h-4 border-l border-dashed border-slate-300" />
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-400">Drop</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-700">{drop.trim() || "Not selected"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-400">Vehicle</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{chosenVehicle?.name || "Choose a vehicle"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Weight className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-400">Package weight</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{weightKg ? `${weightKg} kg` : "Not entered"}</p>
                    </div>
                  </div>
                </div>

                {estimate && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Fare estimate ready
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">Estimated delivery fare</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-[2rem]">
                      {formatPrice(estimate.fare.estimatedFare)}
                    </p>

                    <div className="mt-4 space-y-3 border-t border-emerald-200/80 pt-4 text-xs sm:text-sm">
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Driving distance</span><span className="font-bold text-slate-800">{estimate.route.distanceKm} km</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Estimated time</span><span className="inline-flex items-center gap-1 font-bold text-slate-800"><Clock3 className="h-3.5 w-3.5" />{estimate.route.durationMinutes} min</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Base fare</span><span className="font-semibold text-slate-700">{formatPrice(estimate.fare.baseFare)}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Distance charge</span><span className="font-semibold text-slate-700">{formatPrice(estimate.fare.distanceCharge)}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Weight charge</span><span className="font-semibold text-slate-700">{formatPrice(estimate.fare.weightCharge)}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-slate-500">Service fee</span><span className="font-semibold text-slate-700">{formatPrice(estimate.fare.serviceFee)}</span></div>
                      <div className="flex justify-between gap-3 border-t border-emerald-200/80 pt-3 font-extrabold"><span className="text-slate-800">Estimated total</span><span className="text-emerald-700">{formatPrice(estimate.fare.estimatedFare)}</span></div>
                    </div>
                  </motion.div>
                )}

                {estimateError && (
                  <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-700">
                    {estimateError}
                  </div>
                )}
                {bookingError && (
                  <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-700">
                    {bookingError}
                  </div>
                )}

                {!estimate ? (
                  <button
                    type="button"
                    disabled={!canEstimate}
                    onClick={() => void handleEstimate()}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    {isEstimating ? <><RefreshCw className="h-4 w-4 animate-spin" /> Calculating fare...</> : <>Calculate estimated fare <ArrowRight className="h-4 w-4" /></>}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isCreatingBooking}
                    onClick={() => void handleConfirmBooking()}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {isCreatingBooking ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating booking...</> : <>Confirm booking <ArrowRight className="h-4 w-4" /></>}
                  </button>
                )}

                {!chosenVehicle && (
                  <p className="mt-3 text-center text-xs leading-5 text-slate-400">Select a vehicle to continue.</p>
                )}
                {estimate && (
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">The server rechecks the route and fare when you confirm.</p>
                )}
                <p className="mt-3 text-center text-xs leading-5 text-slate-400">Your booking is not submitted until you confirm.</p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-xs leading-5 text-slate-500">
                <strong className="text-slate-700">Clear estimates.</strong> The backend validates the final route, vehicle and fare before saving your booking.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default BookDelivery;
