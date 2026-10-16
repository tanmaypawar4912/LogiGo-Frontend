import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

function formatJoinedDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500";

function CustomerProfile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.phone]);

  const initials = (user?.name || "LG")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("");

  const cancelEdit = () => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setError("");
    setIsEditing(false);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }
    if (normalizedPhone && !/^\+?[1-9]\d{6,14}$/.test(normalizedPhone)) {
      setError("Enter a valid phone number with country code, if applicable.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch("/auth/profile", {
        name: name.trim(),
        phone: normalizedPhone,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to update your profile.");
      }
      await refreshUser();
      setIsEditing(false);
      setSuccess(response.data.message || "Profile updated successfully.");
    } catch (requestError: unknown) {
      setError(
        isAxiosError(requestError)
          ? requestError.response?.data?.message || "Could not update your profile. Please try again."
          : requestError instanceof Error
            ? requestError.message
            : "Could not update your profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { label: "Email address", value: user?.email || "Not provided", icon: Mail },
    { label: "Member since", value: formatJoinedDate(user?.createdAt), icon: CalendarDays },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 text-slate-900 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Your account</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">My profile</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Manage the name and phone number associated with your LogiGo account.</p>
          </div>
          {!isEditing && (
            <button type="button" onClick={() => { setError(""); setSuccess(""); setIsEditing(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">
              <Pencil className="h-4 w-4" /> Edit profile
            </button>
          )}
        </div>

        {error && <div role="alert" aria-live="polite" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        {success && <div role="status" aria-live="polite" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_34px_rgba(15,23,42,0.045)]">
          <div className="relative overflow-hidden bg-[#101c30] px-5 py-7 text-white sm:px-8 sm:py-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black shadow-lg shadow-orange-500/20">{initials}</div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-2xl font-black">{user?.name || "LogiGo customer"}</h2>
                <p className="mt-1 break-all text-sm text-slate-300">{user?.email || "Email not provided"}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200"><BadgeCheck className="h-4 w-4" /> Customer account</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <label htmlFor="profile-name" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"><UserRound className="h-4 w-4 text-orange-600" /> Full name</label>
                {isEditing ? <input id="profile-name" name="name" autoComplete="name" required minLength={2} maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /> : <p className="mt-3 break-words text-base font-bold text-slate-900">{user?.name || "Not provided"}</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <label htmlFor="profile-phone" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"><Phone className="h-4 w-4 text-orange-600" /> Phone number</label>
                {isEditing ? <input id="profile-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={16} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" className={inputClass} /> : <p className="mt-3 break-words text-base font-bold text-slate-900">{user?.phone || "Not provided"}</p>}
              </div>
              {fields.map((field) => {
                const Icon = field.icon;
                return <div key={field.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500"><Icon className="h-4 w-4 text-orange-600" />{field.label}</div><p className="mt-3 break-words text-base font-bold text-slate-900">{field.value}</p>{field.label === "Email address" && <p className="mt-2 text-xs text-slate-500">Email cannot be changed from this form.</p>}</div>;
              })}
            </div>

            {isEditing && <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={cancelEdit} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" /> Cancel</button>
              <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{isSaving ? "Saving changes…" : "Save changes"}</button>
            </div>}
          </form>

          <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:mx-8 sm:mb-8">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <p className="text-sm leading-6 text-blue-900">Your account is updated securely using your signed-in session. Email address, account role and activation status cannot be changed here.</p>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/customer/orders" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"><CalendarDays className="h-4 w-4" /> View my orders</Link>
          <Link to="/customer/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600">Book a delivery <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </main>
  );
}

export default CustomerProfile;
