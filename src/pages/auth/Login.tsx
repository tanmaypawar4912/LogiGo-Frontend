import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../context/AuthContext";

type LoginError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

function getLoginErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as LoginError;
    const responseMessage = candidate.response?.data?.message;
    if (responseMessage) return responseMessage;
    if (candidate.message) return candidate.message;
  }

  return "Unable to sign in right now. Please check your details and try again.";
}

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      if (!response.success) {
        setError(response.message || "Unable to sign in. Please try again.");
        return;
      }

      const role = response.user?.role;

      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "driver") {
        navigate("/driver", { replace: true });
      } else {
        navigate("/customer", { replace: true });
      }
    } catch (submitError: unknown) {
      setError(getLoginErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)]">
        {/* Brand and product story panel */}
        <section className="relative hidden min-h-screen overflow-hidden bg-[#101d32] text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16 xl:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_82%_72%,rgba(59,130,246,0.14),transparent_32%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-36 top-28 h-96 w-96 rounded-full border border-white/[0.06]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-48 h-56 w-56 rounded-full border border-orange-300/10"
          />

          <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/40">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/30">
              <Truck className="h-6 w-6" strokeWidth={2.3} aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-2xl font-black tracking-tight">LogiGo</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Logistics, simplified
              </span>
            </span>
          </Link>

          <div className="relative z-10 mx-auto w-full max-w-2xl py-14 xl:py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-orange-200">
              <span className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_0_4px_rgba(249,115,22,0.13)]" />
              Your logistics partner
            </div>

            <h1 className="max-w-xl text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
              Your delivery.
              <span className="mt-1 block text-orange-400">Always moving.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Book the right vehicle, manage your deliveries and keep every move on track from one simple place.
            </p>

            <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10 backdrop-blur-sm xl:mt-12 xl:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <PackageCheck className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-extrabold text-white">Every move, made clearer</span>
                    <span className="mt-1 block text-sm text-slate-400">From pickup to destination</span>
                  </span>
                </div>
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
              </div>

              <div className="relative mt-6 h-28 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1729]">
                <div className="absolute inset-x-0 bottom-0 h-10 border-t border-white/[0.07] bg-white/[0.025]" />
                <div className="absolute inset-x-0 bottom-[19px] h-[3px] opacity-80 [background-image:repeating-linear-gradient(to_right,rgba(148,163,184,0.8)_0,rgba(148,163,184,0.8)_28px,transparent_28px,transparent_55px)]" />
                <div className="absolute left-8 top-4 flex items-center gap-2 text-xs font-bold text-slate-300">
                  <MapPin className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Pickup
                </div>
                <div className="absolute right-8 top-4 flex items-center gap-2 text-xs font-bold text-slate-300">
                  Drop-off <MapPin className="h-4 w-4 text-orange-300" aria-hidden="true" />
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 112" fill="none" aria-hidden="true">
                  <path d="M28 70 C110 25 145 102 236 68 S383 28 451 70 S530 78 572 48" stroke="#F97316" strokeOpacity=".65" strokeWidth="2" strokeDasharray="6 8" />
                </svg>
                <motion.div
                  aria-hidden="true"
                  animate={{ x: ["-10%", "390%"] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-8 left-0 rounded-xl bg-orange-500 p-2.5 text-white shadow-lg shadow-orange-950/30"
                >
                  <Truck className="h-5 w-5" />
                </motion.div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="border-l-2 border-orange-400 pl-3">
                <p className="text-sm font-extrabold text-white">Easy booking</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Clear steps</p>
              </div>
              <div className="border-l-2 border-emerald-400 pl-3">
                <p className="text-sm font-extrabold text-white">Clear pricing</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Know the estimate</p>
              </div>
              <div className="border-l-2 border-sky-400 pl-3">
                <p className="text-sm font-extrabold text-white">Live progress</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Follow delivery status</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-500">
            Reliable moves start with LogiGo.
          </p>
        </section>

        {/* Login form */}
        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 sm:py-12 lg:px-10 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
            className="w-full max-w-md"
          >
            <Link to="/" className="mb-9 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
                <Truck className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-black tracking-tight text-slate-900">LogiGo</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Logistics, simplified</span>
              </span>
            </Link>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.13em] text-orange-700">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Secure account access
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Welcome back
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-[17px]">
                Sign in to manage your bookings, deliveries and account.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium leading-6 text-red-800"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-800 sm:text-base">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(error)}
                    className="min-h-[54px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-bold text-slate-800 sm:text-base">
                    Password
                  </label>
                  <Link to="/forgot-password" className="rounded-md text-sm font-bold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(error)}
                    className="min-h-[54px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to LogiGo
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">
                Your account access is protected by LogiGo authentication.
              </p>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-center text-base text-slate-600">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-extrabold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                  Create an account
                </Link>
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Simple booking. Clear pricing. Reliable delivery.
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Login;
