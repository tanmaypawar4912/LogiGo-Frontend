import { motion } from "motion/react";
import {
  ArrowRight,
  MapPin,
  Truck,
  Package,
  ShieldCheck,
  Clock3,
} from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      {/* Navbar */}
      <header className="border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <Truck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-black">LogiGo</h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                Logistics
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#services" className="hover:text-white">
              Services
            </a>

            <a href="#how-it-works" className="hover:text-white">
              How it Works
            </a>

            <a href="#why-logigo" className="hover:text-white">
              Why LogiGo
            </a>
          </div>

          <button className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold transition hover:bg-orange-400">
            Book Now
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.12),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.10),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1.5 text-xs font-bold text-orange-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
              On-demand delivery
            </div>

            <h2 className="max-w-2xl text-5xl font-black leading-[1] tracking-tight sm:text-6xl lg:text-7xl">
              Move anything.
              <span className="block text-orange-400">Anywhere.</span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Book a vehicle, choose your route, get an estimated fare, and
              track your delivery from pickup to destination.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="group flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 font-bold shadow-xl shadow-orange-500/20 transition hover:-translate-y-1 hover:bg-orange-400">
                Start Booking
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 font-bold text-slate-200 transition hover:bg-white/[0.07]">
                Explore Services
              </button>
            </div>
          </motion.div>

          {/* Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative"
          >
            <div className="relative h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c1728] shadow-2xl">
              {/* Route */}
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 700 420"
                preserveAspectRatio="none"
              >
                <path
                  d="M80 100 C200 30, 260 230, 370 150 C470 80, 520 300, 620 270"
                  fill="none"
                  stroke="rgba(249,115,22,0.2)"
                  strokeWidth="15"
                  strokeLinecap="round"
                />

                <path
                  d="M80 100 C200 30, 260 230, 370 150 C470 80, 520 300, 620 270"
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="4"
                  strokeDasharray="12 12"
                  strokeLinecap="round"
                />
              </svg>

              {/* Pickup */}
              <div className="absolute left-6 top-10 flex items-center gap-2 rounded-full bg-slate-950/90 px-3 py-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold">Pickup</span>
              </div>

              {/* Drop */}
              <div className="absolute bottom-36 right-6 flex items-center gap-2 rounded-full bg-slate-950/90 px-3 py-2">
                <MapPin className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-bold">Drop</span>
              </div>

              {/* Truck */}
              <motion.div
                className="absolute left-10 top-24"
                animate={{
                  x: [0, 130, 270, 430],
                  y: [0, 80, 25, 75],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="rounded-2xl bg-orange-500 p-3 shadow-xl shadow-orange-500/30">
                  <Truck className="h-7 w-7" />
                </div>
              </motion.div>

              {/* Road */}
              <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden border-t border-white/10 bg-[#111827]">
                <div className="road-lines absolute inset-0" />
              </div>

              {/* Info Card */}
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-5 top-5 w-48 rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-400/10 p-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div>
                    <p className="text-xs font-bold">Driver matched</p>
                    <p className="text-[10px] text-slate-500">
                      Almost ready
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    animate={{
                      width: ["20%", "85%", "20%"],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                    }}
                    className="h-full rounded-full bg-orange-400"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-y border-white/5">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            Services
          </p>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Built for every kind of move.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Package,
                title: "Parcel Delivery",
                text: "Fast and reliable movement of packages.",
              },
              {
                icon: Truck,
                title: "Mini Truck",
                text: "Perfect for household and business goods.",
              },
              {
                icon: Clock3,
                title: "On-Demand",
                text: "Book transportation whenever you need it.",
              },
            ].map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-orange-400/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
                    <Icon className="h-6 w-6 text-orange-400" />
                  </div>

                  <h3 className="mt-6 text-xl font-bold">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {service.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
      >
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
          Simple process
        </p>

        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          Book in four simple steps.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            "Enter pickup",
            "Enter drop",
            "Choose vehicle",
            "Track delivery",
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-5"
            >
              <div className="text-sm font-black text-orange-400">
                0{index + 1}
              </div>

              <h3 className="mt-4 font-bold">{step}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;