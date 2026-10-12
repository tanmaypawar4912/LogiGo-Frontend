import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Truck,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login({
        email,
        password,
      });

      if (!response.success) {
        setError(response.message);
        return;
      }

      const role = response.user?.role;

      if (role === "admin") {
        navigate("/admin");
      } else if (role === "driver") {
        navigate("/driver");
      } else {
        navigate("/customer");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Visual side */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(249,115,22,0.16),transparent_35%),radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.12),transparent_35%)]" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500">
                <Truck className="h-6 w-6" />
              </div>

              <div>
                <div className="font-black">
                  LogiGo
                </div>

                <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Logistics
                </div>
              </div>
            </Link>

            <div>
              <h1 className="max-w-xl text-5xl font-black leading-tight">
                Your delivery.
                <span className="block text-orange-400">
                  In motion.
                </span>
              </h1>

              <p className="mt-5 max-w-lg leading-7 text-slate-400">
                Book vehicles, manage deliveries and
                track every movement from one place.
              </p>

              <div className="relative mt-12 h-32 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50">
                <div className="road-lines absolute bottom-0 left-0 right-0 h-14" />

                <motion.div
                  animate={{
                    x: ["-10%", "110%"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute bottom-10"
                >
                  <div className="rounded-xl bg-orange-500 p-3 shadow-xl shadow-orange-500/30">
                    <Truck className="h-6 w-6" />
                  </div>
                </motion.div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Fast moves. Smart logistics.
            </p>
          </div>
        </div>

        {/* Form side */}
        <div className="flex min-h-screen items-center justify-center px-5 py-10">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <Link
              to="/"
              className="mb-10 flex items-center gap-3 lg:hidden"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
                <Truck className="h-5 w-5" />
              </div>

              <span className="text-xl font-black">
                LogiGo
              </span>
            </Link>

            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
                Welcome back
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Sign in to LogiGo
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Access your bookings, deliveries and
                account.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-300"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-12 text-sm outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 font-bold transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Signing in..."
                  : "Sign In"}

                {!isSubmitting && (
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-orange-400 hover:text-orange-300"
              >
                Create one
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;