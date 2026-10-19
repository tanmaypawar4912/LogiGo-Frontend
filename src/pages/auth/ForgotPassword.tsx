import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, Truck } from "lucide-react";
import { isAxiosError } from "axios";

import api from "../../services/api";

function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    return error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Could not connect to LogiGo. Please try again when the service is available."
        : "Unable to submit your request. Please try again.");
  }
  return error instanceof Error ? error.message : "Unable to submit your request. Please try again.";
}

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: email.trim() });
      if (response.data?.success) {
        setSubmitted(true);
      } else {
        setError(response.data?.message || "Unable to submit your request.");
      }
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 antialiased sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.09)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative hidden overflow-hidden bg-[#13223a] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
            <Link to="/" className="relative inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-950/20"><Truck className="h-6 w-6" /></span>
              <span><span className="block text-2xl font-black tracking-tight">LogiGo</span><span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">Logistics, simplified</span></span>
            </Link>
            <div className="relative max-w-md py-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-100/10 px-3 py-1.5 text-sm font-bold text-orange-200"><ShieldCheck className="h-4 w-4" /> Account security</span>
              <h1 className="mt-6 text-4xl font-black leading-tight xl:text-5xl">A secure way back to your account.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">We’ll help you reset your password so you can get back to managing your deliveries.</p>
            </div>
            <p className="relative text-sm text-slate-400">Reset links expire after 15 minutes and can only be used once.</p>
          </section>

          <section className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-12 xl:px-16">
            <div className="w-full max-w-md">
              <Link to="/" className="mb-8 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white"><Truck className="h-5 w-5" /></span>
                <span className="text-xl font-black">LogiGo</span>
              </Link>

              <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-orange-700">Account recovery</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Forgot your password?</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Enter the email address associated with your account. If an active account exists, we’ll send a secure reset link.</p>

              {error && <div role="alert" aria-live="polite" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium leading-6 text-rose-800">{error}</div>}

              {submitted ? (
                <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                    <div><h3 className="font-extrabold text-emerald-950">Check your inbox</h3><p className="mt-1 text-sm leading-6 text-emerald-800">{`If an active account exists for ${email.trim()}, a reset link will be sent shortly. Check spam too.`}</p></div>
                  </div>
                  <button type="button" onClick={() => { setSubmitted(false); setError(""); }} className="mt-4 text-sm font-bold text-emerald-800 underline underline-offset-4">Try another email</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-slate-800 sm:text-base">Email address</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <input id="reset-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }} placeholder="you@example.com" className="min-h-[56px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="group flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                    {isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> Sending request...</> : <>Send reset link <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" /></>}
                  </button>
                  <p className="text-center text-sm leading-6 text-slate-500">For security, the same confirmation is shown whether or not the email belongs to an account.</p>
                </form>
              )}

              <div className="mt-8 border-t border-slate-200 pt-6">
                <Link to="/login" className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-base font-bold text-slate-600 transition hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
