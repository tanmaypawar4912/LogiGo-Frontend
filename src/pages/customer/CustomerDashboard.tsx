
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Clock3,
  LogOut,
  MapPin,
  Package,
  Truck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/customer" className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500 p-2.5">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black">LogiGo</p>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                Customer
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:py-14">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17253a] to-[#0c1422] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-8 -top-8 opacity-10">
            <Truck className="h-52 w-52" />
          </div>

          <div className="relative max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
              Customer dashboard
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-5xl">
              Welcome, {user?.name || "Customer"}
            </h1>

            <p className="mt-4 max-w-xl leading-7 text-slate-400">
              Ready to move something? Book a vehicle and organise
              your next delivery from one place.
            </p>

            <Link
              to="/customer/book"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-bold transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              <Package className="h-5 w-5" />
              Book a delivery
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section className="mt-9">
          <h2 className="text-xl font-bold">Quick actions</h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose what you want to do next.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/customer/book"
              className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-orange-400/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10">
                <Package className="h-6 w-6 text-orange-400" />
              </div>

              <h3 className="mt-5 font-bold">Book Delivery</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter pickup, destination and package details.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-orange-400">
                Start booking
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>

              <h3 className="mt-5 font-bold">Track a Delivery</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Order tracking will be available once a booking has
                been created.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10">
                <Clock3 className="h-6 w-6 text-emerald-400" />
              </div>

              <h3 className="mt-5 font-bold">Booking History</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your completed and cancelled bookings will appear here
                after the order history API is implemented.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CustomerDashboard;
