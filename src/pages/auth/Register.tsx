import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "../../context/AuthContext";

type RegistrationError = {
  response?: { data?: { message?: string } };
  message?: string;
};

function getRegistrationErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as RegistrationError;
    if (candidate.response?.data?.message) return candidate.response.data.message;
    if (candidate.message) return candidate.message;
  }
  return "Unable to create your account right now. Please try again.";
}

const inputClass =
  "min-h-[54px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const labelClass = "mb-2 block text-sm font-bold text-slate-800 sm:text-base";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isSubmitting) return;

    if (name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
      });

      if (!response.success) {
        setError(response.message || "Unable to create your account.");
        return;
      }

      if (role === "driver") {
        navigate("/driver/profile", { replace: true });
      } else {
        navigate("/customer", { replace: true });
      }
      
    } catch (submitError: unknown) {
      setError(getRegistrationErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 antialiased">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="relative hidden min-h-screen overflow-hidden bg-[#101d32] text-white lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16 xl:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(249,115,22,0.23),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(59,130,246,0.14),transparent_32%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-32 h-96 w-96 rounded-full border border-white/[0.07]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-52 h-56 w-56 rounded-full border border-orange-300/10" />

          <Link to="/" className="relative z-10 flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300/40">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/20">
              <Truck className="h-6 w-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-black tracking-tight">LogiGo</span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Logistics, simplified</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-xl py-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-200">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> Join the LogiGo network
            </span>
            <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
              Every move starts with
              <span className="mt-2 block text-orange-400">a smarter connection.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Create your account to book deliveries, follow your orders, or apply to deliver with LogiGo.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/15 text-orange-300"><ShieldCheck className="h-5 w-5" /></span>
                <p className="mt-4 text-base font-extrabold">Simple and secure</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Your account is protected by LogiGo authentication.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span>
                <p className="mt-4 text-base font-extrabold">Built for your journey</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Keep deliveries and driver work in one place.</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-500">Moving your world, one delivery at a time.</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-10 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl"
          >
            <Link to="/" className="mb-8 flex w-fit items-center gap-3 rounded-xl lg:hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20"><Truck className="h-5 w-5" /></span>
              <span><span className="block text-xl font-black tracking-tight">LogiGo</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Logistics, simplified</span></span>
            </Link>

            <div className="mb-7">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-700">Get started</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Create your account</h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Choose how you want to use LogiGo. Drivers will complete licence and vehicle verification after creating their account.</p>
            </div>

            {error && (
              <div role="alert" aria-live="polite" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium leading-6 text-red-800">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset>
                <legend className={labelClass}>I want to</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={role === "customer"}
                    onClick={() => setRole("customer")}
                    className={`flex min-h-[94px] items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${role === "customer" ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role === "customer" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}><UsersRound className="h-5 w-5" /></span>
                    <span className="min-w-0"><span className="block text-base font-extrabold text-slate-900">Book deliveries</span><span className="mt-1 block text-sm leading-5 text-slate-600">Create a customer account</span></span>
                    {role === "customer" && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-orange-600" />}
                  </button>
                  <button
                    type="button"
                    aria-pressed={role === "driver"}
                    onClick={() => setRole("driver")}
                    className={`flex min-h-[94px] items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${role === "driver" ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role === "driver" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}><Truck className="h-5 w-5" /></span>
                    <span className="min-w-0"><span className="block text-base font-extrabold text-slate-900">Deliver with us</span><span className="mt-1 block text-sm leading-5 text-slate-600">Apply for a driver account</span></span>
                    {role === "driver" && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-orange-600" />}
                  </button>
                </div>
              </fieldset>

              <div>
                <label htmlFor="register-name" className={labelClass}>Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="register-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={50} value={name} onChange={(event) => { setName(event.target.value); if (error) setError(""); }} placeholder="Enter your full name" className={inputClass} />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-email" className={labelClass}>Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }} placeholder="you@example.com" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label htmlFor="register-phone" className={labelClass}>Phone number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="register-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => { setPhone(event.target.value); if (error) setError(""); }} placeholder="+91 98765 43210" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="register-password" className={labelClass}>Password</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }} placeholder="At least 8 characters" className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">Use at least 8 characters.</p>
                </div>
                <div>
                  <label htmlFor="register-confirm-password" className={labelClass}>Confirm password</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="register-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (error) setError(""); }} placeholder="Re-enter password" className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-600">Your account details are used to create your LogiGo profile. Keep your password private and never share it with anyone.</p>
              </div>

              <button type="submit" disabled={isSubmitting} className="group flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0">
                {isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />Creating account...</> : <>Create {role === "driver" ? "driver" : "customer"} account <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" /></>}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-200 pt-6 text-center">
              <p className="text-base text-slate-600">Already have an account?{" "}<Link to="/login" className="font-extrabold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">Sign in</Link></p>
              <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"><ArrowLeft className="h-4 w-4" />Back to home</Link>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Register;
