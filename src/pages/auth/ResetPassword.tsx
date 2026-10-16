import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import { isAxiosError } from "axios";

import api from "../../services/api";

function resetErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    return error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Could not connect to LogiGo. Please try again when the service is available."
        : "Unable to reset your password. Please try again.");
  }
  return error instanceof Error ? error.message : "Unable to reset your password. Please try again.";
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (isSubmitting) return;

    if (!token) {
      setError("This reset link is missing its token. Request a new password reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }
    if (password.length > 128) {
      setError("Your password must be no more than 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/reset-password", { token, password });
      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(response.data?.message || "Unable to reset your password.");
      }
    } catch (submitError: unknown) {
      setError(resetErrorMessage(submitError));
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
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/20 bg-orange-100/10 px-3 py-1.5 text-sm font-bold text-orange-200"><ShieldCheck className="h-4 w-4" /> Secure account access</span>
              <h1 className="mt-6 text-4xl font-black leading-tight xl:text-5xl">Choose a strong new password.</h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">Use at least 8 characters. Once your password changes, existing refresh-token sessions will be revoked.</p>
            </div>
            <p className="relative text-sm text-slate-400">Reset links expire after 15 minutes and can only be used once.</p>
          </section>

          <section className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-12 xl:px-16">
            <div className="w-full max-w-md">
              <Link to="/" className="mb-8 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white"><Truck className="h-5 w-5" /></span>
                <span className="text-xl font-black">LogiGo</span>
              </Link>

              {success ? (
                <div role="status" className="text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></span>
                  <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.16em] text-emerald-700">Password updated</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">You’re all set.</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">Your password was changed. Sign in using your new password to continue.</p>
                  <button type="button" onClick={() => navigate("/login", { replace: true })} className="group mt-7 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">Go to login <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-orange-700">Password recovery</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Set a new password</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">Choose a new password for your LogiGo account.</p>

                  {error && <div role="alert" aria-live="polite" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium leading-6 text-rose-800">{error}</div>}

                  <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    <div>
                      <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-slate-800 sm:text-base">New password</label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(""); }} placeholder="At least 8 characters" className="min-h-[56px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
                        <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">Use 8–128 characters.</p>
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-slate-800 sm:text-base">Confirm new password</label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input id="confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (error) setError(""); }} placeholder="Re-enter your new password" className="min-h-[56px] w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
                        <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting || !token} className="group flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                      {isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> Updating password...</> : <>Update password <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden="true" /></>}
                    </button>
                    {!token && <p role="alert" className="text-sm font-medium text-rose-700">This link does not contain a reset token. Request a new link.</p>}
                  </form>
                </>
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

export default ResetPassword;
