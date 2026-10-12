
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { isAxiosError } from "axios";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  Weight,
} from "lucide-react";

import api from "../../services/api";

interface PopulatedVehicle {
  _id: string;
  name: string;
  capacityKg: number;
}

interface Booking {
  _id: string;
  bookingCode: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  vehicle: PopulatedVehicle | string;

  pickup: {
    address: string;
  };

  drop: {
    address: string;
  };

  package: {
    description: string;
    weightKg: number;
    specialInstructions: string;
  };

  route: {
    distanceKm: number;
    durationMinutes: number;
  };

  fare: {
    currency: string;
    estimatedFare: number;
    finalFare: number | null;
  };
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatStatus = (status: string) =>
  status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBooking() {
      if (!id) {
        setError("Booking ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/bookings/${id}`);

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Unable to load booking."
          );
        }

        if (active) {
          setBooking(response.data.booking);
        }
      } catch (requestError: unknown) {
        if (!active) return;

        if (isAxiosError(requestError)) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load this booking."
          );
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load this booking."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      active = false;
    };
  }, [id]);

  const vehicleName =
    booking && typeof booking.vehicle === "object"
      ? booking.vehicle.name
      : "Selected vehicle";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-white">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-orange-400" />
          <p className="mt-4 text-sm text-slate-400">
            Loading your booking...
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center">
          <Package className="mx-auto h-10 w-10 text-orange-400" />

          <h1 className="mt-4 text-2xl font-black">
            Booking unavailable
          </h1>

          <p
            role="alert"
            className="mt-3 text-sm leading-6 text-slate-400"
          >
            {error || "Booking details could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/customer")}
            className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-bold hover:bg-orange-400"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayedFare =
    booking.fare.finalFare ?? booking.fare.estimatedFare;

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-white/10 bg-[#07111f]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/customer" className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500 p-2.5">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-black">LogiGo</span>
          </Link>

          <Link
            to="/customer"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Booking created
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Your booking is confirmed in the system.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Your booking request has been saved successfully.
                  A driver has not yet been assigned.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Booking code</p>
                <p className="mt-2 break-all font-bold text-white">
                  {booking.bookingCode}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Booking status</p>
                <p className="mt-2 inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
                  {formatStatus(booking.status)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Payment status</p>
                <p className="mt-2 font-semibold">
                  {formatStatus(booking.paymentStatus)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-7">
              <h2 className="text-xl font-bold">
                Delivery details
              </h2>

              <div className="mt-7 space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      Pickup location
                    </p>
                    <p className="mt-2 break-words leading-6 text-slate-200">
                      {booking.pickup.address}
                    </p>
                  </div>
                </div>

                <div className="ml-5 h-8 border-l border-dashed border-white/20" />

                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-400/10">
                    <MapPin className="h-5 w-5 text-orange-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      Drop location
                    </p>
                    <p className="mt-2 break-words leading-6 text-slate-200">
                      {booking.drop.address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="my-7 border-t border-white/10" />

              <h2 className="text-xl font-bold">
                Package and vehicle
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Truck className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-500">Vehicle</p>
                    <p className="mt-1 font-semibold">{vehicleName}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Weight className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="mt-1 font-semibold">
                      {booking.package.weightKg} kg
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 sm:col-span-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-slate-500">
                      Package description
                    </p>
                    <p className="mt-1 font-semibold">
                      {booking.package.description}
                    </p>
                  </div>
                </div>

                {booking.package.specialInstructions && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500">
                      Special instructions
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {booking.package.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-lg font-bold">
                Route and fare
              </h2>

              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" />
                    Driving distance
                  </span>
                  <span className="font-semibold">
                    {booking.route.distanceKm} km
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    Estimated time
                  </span>
                  <span className="font-semibold">
                    {booking.route.durationMinutes} min
                  </span>
                </div>

                <div className="border-t border-white/10 pt-5">
                  <p className="text-sm text-slate-400">
                    {booking.fare.finalFare == null
                      ? "Estimated fare"
                      : "Final fare"}
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {formatPrice(displayedFare)}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-5 text-amber-200/80">
                  No payment has been collected. The booking remains
                  pending until a driver is assigned.
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/customer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-bold transition hover:bg-orange-400"
            >
              Go to dashboard
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>

            <Link
              to="/customer/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Book another delivery
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default BookingDetails;
