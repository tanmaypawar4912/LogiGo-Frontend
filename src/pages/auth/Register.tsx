import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] =
    useState<"customer" | "driver">("customer");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await register({
        name,
        email,
        phone,
        password,
        role,
      });

      if (!response.success) {
        setError(response.message);
        return;
      }

      if (role === "driver") {
        navigate("/driver");
      } else {
        navigate("/customer");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to create account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
              <Truck className="h-5 w-5" />
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

          <Link
            to="/login"
            className="text-sm font-semibold text-slate-400 hover:text-white"
          >
            Already have an account?
          </Link>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mx-auto mt-14 max-w-xl"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
            Get started
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Create your LogiGo account
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Book deliveries as a customer or join
            LogiGo as a driver.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {/* Role */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-300">
                I want to
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setRole("customer")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    role === "customer"
                      ? "border-orange-400/50 bg-orange-400/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="font-bold">
                    Book deliveries
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Customer account
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setRole("driver")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    role === "driver"
                      ? "border-orange-400/50 bg-orange-400/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="font-bold">
                    Deliver with us
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Driver account
                  </div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Full name
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Your full name"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-orange-400/50"
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Email
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
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm outline-none focus:border-orange-400/50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Phone
                </label>

                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="+91..."
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm outline-none focus:border-orange-400/50"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Password
              </label>

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
                  minLength={8}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-12 text-sm outline-none focus:border-orange-400/50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-5 text-slate-500">
              By creating an account, you agree to
              use LogiGo according to its service and
              safety rules.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 font-bold transition hover:bg-orange-400 disabled:opacity-60"
            >
              {isSubmitting
                ? "Creating account..."
                : "Create Account"}

              {!isSubmitting && (
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              )}
            </button>
          </form>

          <p className="pb-10 pt-8 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-bold text-orange-400"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;