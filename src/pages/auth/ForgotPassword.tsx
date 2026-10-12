import { Link } from "react-router";
import { ArrowLeft, Mail, Truck } from "lucide-react";

const ForgotPassword = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-white">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-10 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <Truck className="h-5 w-5" />
          </div>

          <span className="text-xl font-black">
            LogiGo
          </span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
          <h1 className="text-2xl font-black">
            Forgot your password?
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your email and we'll help you reset
            your password.
          </p>

          <form className="mt-7">
            <label
              htmlFor="reset-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email address
            </label>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-12 pr-4 text-sm outline-none focus:border-orange-400/50"
              />
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-2xl bg-orange-500 py-4 font-bold hover:bg-orange-400"
            >
              Send Reset Link
            </button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;