import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import { BadgeCheck, CalendarDays, Clock3, FileText, Info, LoaderCircle, Mail, Pencil, Phone, Save, ShieldCheck, Truck, UserRound } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import VehiclePhotoUploader, { type VehiclePhotoView } from "../../components/driver/VehiclePhotoUploader";

interface VehicleOption { _id: string; name: string; slug: string; capacityKg: number; imageUrl?: string | null; }
type Status = "pending" | "approved" | "rejected" | "suspended";
interface PhotoSet { front?: string; right?: string; left?: string; back?: string; }
interface DriverProfileData {
  _id: string; licenseNumber: string; licenseExpiry: string; vehicleType: string; vehicleMakeModel: string; vehicleRegistration: string; vehicleCapacityKg: number;
  documents: { licenseDocumentUrl?: string | null; identityDocumentUrl?: string | null; vehicleDocumentUrl?: string | null };
  vehiclePhotos?: PhotoSet; approvalStatus: Status; isActive: boolean; availability: "offline" | "online" | "busy"; rejectionReason?: string;
  profileChangeRequest?: { licenseNumber?: string; licenseExpiry?: string; reason?: string; status?: "pending" | "approved" | "rejected"; reviewNote?: string } | null;
}
interface InitialForm {
  licenseNumber: string; licenseExpiry: string; vehicleType: string; vehicleMakeModel: string; vehicleRegistration: string; vehicleCapacityKg: string;
  licenseDocumentUrl: string; identityDocumentUrl: string; vehicleDocumentUrl: string; photoFront: string; photoRight: string; photoLeft: string; photoBack: string;
}
interface ChangeForm { licenseNumber: string; licenseExpiry: string; licenseDocumentUrl: string; identityDocumentUrl: string; reason: string; }
const emptyInitial: InitialForm = { licenseNumber: "", licenseExpiry: "", vehicleType: "", vehicleMakeModel: "", vehicleRegistration: "", vehicleCapacityKg: "", licenseDocumentUrl: "", identityDocumentUrl: "", vehicleDocumentUrl: "", photoFront: "", photoRight: "", photoLeft: "", photoBack: "" };
const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const labelClass = "block text-xs font-extrabold tracking-wide text-slate-700 sm:text-sm";
const panelClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
const today = () => new Date().toISOString().slice(0, 10);
function errorMessage(error: unknown, fallback: string) { if (isAxiosError(error)) return error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot connect to LogiGo. Check that the backend is running." : fallback); return error instanceof Error ? error.message : fallback; }
function isHttps(value: string) { try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password; } catch { return false; } }
function statusStyles(status: Status) { return status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "rejected" || status === "suspended" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; }
function photoInputs(form: InitialForm, setForm: Dispatch<SetStateAction<InitialForm>>, prefix = "") {
  const fields: { label: string; key: "photoFront" | "photoRight" | "photoLeft" | "photoBack"; view: VehiclePhotoView }[] = [
    { label: "Front view", key: "photoFront", view: "front" },
    { label: "Right-side view", key: "photoRight", view: "right" },
    { label: "Left-side view", key: "photoLeft", view: "left" },
    { label: "Back view", key: "photoBack", view: "back" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <VehiclePhotoUploader
          key={field.key}
          title={`${prefix}${field.label} photo`}
          view={field.view}
          value={form[field.key]}
          required
          onUploaded={(url) => setForm((current) => ({ ...current, [field.key]: url }))}
        />
      ))}
    </div>
  );
}

export default function DriverProfile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<DriverProfileData | null>(null);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [initial, setInitial] = useState<InitialForm>(emptyInitial);
  const [change, setChange] = useState<ChangeForm>({ licenseNumber: "", licenseExpiry: "", licenseDocumentUrl: "", identityDocumentUrl: "", reason: "" });
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountName, setAccountName] = useState(user?.name || "");
  const [accountPhone, setAccountPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accountError, setAccountError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [vehiclesResult, profileResult] = await Promise.allSettled([api.get("/vehicles"), api.get("/drivers/profile")]);
    if (vehiclesResult.status === "fulfilled" && vehiclesResult.value.data?.success) setVehicleOptions(Array.isArray(vehiclesResult.value.data.vehicles) ? vehiclesResult.value.data.vehicles : []);
    else setVehicleOptions([]);
    if (profileResult.status === "fulfilled" && profileResult.value.data?.success) {
      const item = profileResult.value.data.profile as DriverProfileData;
      setProfile(item);
      const exp = item.licenseExpiry ? new Date(item.licenseExpiry).toISOString().slice(0, 10) : "";
      setChange({ licenseNumber: item.licenseNumber || "", licenseExpiry: exp, licenseDocumentUrl: item.documents?.licenseDocumentUrl || "", identityDocumentUrl: item.documents?.identityDocumentUrl || "", reason: "" });
    } else if (profileResult.status === "rejected" && isAxiosError(profileResult.reason) && profileResult.reason.response?.status === 404) {
      setProfile(null); setInitial(emptyInitial);
    } else if (profileResult.status === "rejected") setError(errorMessage(profileResult.reason, "Unable to load driver profile."));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setAccountName(user?.name || ""); setAccountPhone(user?.phone || ""); }, [user?.name, user?.phone]);

  const selectedVehicle = useMemo(() => vehicleOptions.find((item) => item.slug === initial.vehicleType), [vehicleOptions, initial.vehicleType]);
  function changeInitial<K extends keyof InitialForm>(key: K, value: InitialForm[K]) { setInitial((current) => ({ ...current, [key]: value })); setError(""); setNotice(""); }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAccountError("");
    const normalizedPhone = accountPhone.trim().replace(/[\s()-]/g, "");
    if (accountName.trim().length < 2) { setAccountError("Name must contain at least 2 characters."); return; }
    if (!/^\+?[1-9]\d{6,14}$/.test(normalizedPhone)) { setAccountError("Enter a valid mobile number, including country code if needed."); return; }
    setAccountSaving(true);
    try {
      const response = await api.patch("/auth/profile", { name: accountName.trim(), phone: normalizedPhone });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not save account details.");
      await refreshUser(); setIsEditingAccount(false); setNotice("Account name and mobile number updated.");
    } catch (e: unknown) { setAccountError(errorMessage(e, "Could not save account details.")); }
    finally { setAccountSaving(false); }
  }

  async function submitInitial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!selectedVehicle) { setError("Select an active vehicle type from the LogiGo catalogue."); return; }
    if (new Date(initial.licenseExpiry) <= new Date()) { setError("The driving licence expiry date must be in the future."); return; }
    const urls = [initial.licenseDocumentUrl, initial.identityDocumentUrl, initial.vehicleDocumentUrl, initial.photoFront, initial.photoRight, initial.photoLeft, initial.photoBack];
    if (urls.some((url) => !isHttps(url.trim()))) { setError("All document and vehicle-photo links must be valid HTTPS URLs."); return; }
    setSaving(true);
    try {
      const response = await api.post("/drivers/profile", {
        licenseNumber: initial.licenseNumber.trim().toUpperCase(), licenseExpiry: initial.licenseExpiry,
        vehicleType: initial.vehicleType, vehicleMakeModel: initial.vehicleMakeModel.trim(), vehicleRegistration: initial.vehicleRegistration.trim().toUpperCase(), vehicleCapacityKg: Number(initial.vehicleCapacityKg),
        vehicleDocumentUrl: initial.vehicleDocumentUrl.trim(), photos: { front: initial.photoFront.trim(), right: initial.photoRight.trim(), left: initial.photoLeft.trim(), back: initial.photoBack.trim() },
        documents: { licenseDocumentUrl: initial.licenseDocumentUrl.trim(), identityDocumentUrl: initial.identityDocumentUrl.trim(), vehicleDocumentUrl: initial.vehicleDocumentUrl.trim() },
      });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not submit the driver profile.");
      setNotice("Your profile is submitted and locked. An administrator must approve it before you can go online or receive jobs.");
      await load();
    } catch (e: unknown) { setError(errorMessage(e, "Unable to submit driver profile.")); }
    finally { setSaving(false); }
  }

  async function submitChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!isHttps(change.licenseDocumentUrl) || !isHttps(change.identityDocumentUrl)) { setError("Use secure HTTPS URLs for both licence and identity documents."); return; }
    if (new Date(change.licenseExpiry) <= new Date()) { setError("The requested licence expiry date must be in the future."); return; }
    setSaving(true);
    try {
      const response = await api.post("/drivers/profile/change-request", { licenseNumber: change.licenseNumber.trim().toUpperCase(), licenseExpiry: change.licenseExpiry, documents: { licenseDocumentUrl: change.licenseDocumentUrl.trim(), identityDocumentUrl: change.identityDocumentUrl.trim() }, reason: change.reason.trim() });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not submit the change request.");
      setNotice(response.data.message || "Your change request has been sent for admin approval."); setShowChangeForm(false); await load();
    } catch (e: unknown) { setError(errorMessage(e, "Unable to submit profile change request.")); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1400px]">
    <header className="mb-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">Driver verification</p><h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.65rem)] font-black tracking-tight">My profile & approval</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Your account details, driving licence record and verification status. Submitted identity details cannot be changed without administrator approval.</p></header>

    {(error || accountError) && <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">{error || accountError}</div>}
    {notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">{notice}</div>}

    <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-[#101c30] via-[#101c30] to-[#302526] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex min-w-0 items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black shadow-lg shadow-orange-500/20">{(user?.name || "Driver").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-300">Driver account</p><h2 className="mt-1 break-words text-xl font-black sm:text-2xl">{user?.name || "Driver"}</h2><p className="mt-1 break-words text-sm text-slate-300">{user?.email || "Email unavailable"}</p></div></div><button type="button" onClick={() => setIsEditingAccount((current) => !current)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-extrabold hover:bg-white/15"><Pencil className="h-4 w-4" />{isEditingAccount ? "Close edit" : "Edit account"}</button></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><UserRound className="h-3.5 w-3.5 text-orange-600" />Full name</p><p className="mt-2 break-words text-sm font-black">{user?.name || "Not set"}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><Phone className="h-3.5 w-3.5 text-orange-600" />Mobile number</p><p className="mt-2 break-words text-sm font-black">{user?.phone || "Not added"}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><Mail className="h-3.5 w-3.5 text-orange-600" />Email address</p><p className="mt-2 break-words text-sm font-black">{user?.email || "Not available"}</p><p className="mt-1 text-[10px] text-slate-500">Not editable here</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><CalendarDays className="h-3.5 w-3.5 text-orange-600" />Member since</p><p className="mt-2 text-sm font-black">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "LogiGo member"}</p></div></div>
      {isEditingAccount && <form onSubmit={saveAccount} className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2 sm:p-5"><div><label className={labelClass}>Name<input value={accountName} onChange={(event) => setAccountName(event.target.value)} required minLength={2} maxLength={50} className={inputClass} /></label></div><div><label className={labelClass}>Mobile number<input value={accountPhone} onChange={(event) => setAccountPhone(event.target.value)} required type="tel" autoComplete="tel" className={inputClass} /></label></div><div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={accountSaving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50">{accountSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save account details</button><button type="button" onClick={() => { setAccountName(user?.name || ""); setAccountPhone(user?.phone || ""); setAccountError(""); setIsEditingAccount(false); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button></div></form>}
    </section>

    {loading ? <div className={`${panelClass} py-14 text-center`}><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" /><p className="mt-3 text-sm text-slate-500">Loading driver verification…</p></div> : !profile ? <form onSubmit={submitInitial} className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Initial driver onboarding.</strong> Complete all licence, vehicle, document and 4-angle photo fields. After submission, these details become locked until the admin reviews a change request.</div>
      <section className={panelClass}><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-base font-black sm:text-lg">Driving licence details</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Use details as printed on the licence.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}>Licence number *<input required minLength={5} maxLength={30} value={initial.licenseNumber} onChange={(e) => changeInitial("licenseNumber", e.target.value.toUpperCase())} className={inputClass} /></label><label className={labelClass}>Licence expiry date *<input required type="date" min={today()} value={initial.licenseExpiry} onChange={(e) => changeInitial("licenseExpiry", e.target.value)} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>Licence document HTTPS URL *<input required type="url" value={initial.licenseDocumentUrl} onChange={(e) => changeInitial("licenseDocumentUrl", e.target.value)} placeholder="https://secure-storage/..." className={inputClass} /></label></div></section>
      <section className={panelClass}><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Truck className="h-5 w-5" /></span><div><h2 className="text-base font-black sm:text-lg">Primary vehicle details</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Vehicle categories come from the admin-managed catalogue.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}>Vehicle category *<select required value={initial.vehicleType} onChange={(e) => { const value = e.target.value; const option = vehicleOptions.find((v) => v.slug === value); setInitial((old) => ({ ...old, vehicleType: value, vehicleCapacityKg: old.vehicleCapacityKg || (option ? String(option.capacityKg) : "") })); }} className={inputClass}><option value="">Choose active vehicle type</option>{vehicleOptions.map((v) => <option key={v._id} value={v.slug}>{v.name} · {v.capacityKg.toLocaleString("en-IN")} kg</option>)}</select></label><label className={labelClass}>Vehicle make/model *<input required minLength={2} maxLength={100} value={initial.vehicleMakeModel} onChange={(e) => changeInitial("vehicleMakeModel", e.target.value)} placeholder="e.g. Tata Ace Gold" className={inputClass} /></label><label className={labelClass}>Registration number *<input required minLength={4} maxLength={30} value={initial.vehicleRegistration} onChange={(e) => changeInitial("vehicleRegistration", e.target.value.toUpperCase())} placeholder="MH12AB1234" className={inputClass} /></label><label className={labelClass}>Vehicle carrying capacity (kg) *<input required type="number" min={1} max={50000} step={1} value={initial.vehicleCapacityKg} onChange={(e) => changeInitial("vehicleCapacityKg", e.target.value)} placeholder="750" className={inputClass} /></label></div>{selectedVehicle?.imageUrl && <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><img src={selectedVehicle.imageUrl} alt={selectedVehicle.name} className="h-14 w-20 rounded-lg object-contain" /><div><p className="text-sm font-extrabold">{selectedVehicle.name}</p><p className="text-xs text-slate-500">Admin catalogue · up to {selectedVehicle.capacityKg.toLocaleString("en-IN")} kg category rating</p></div></div>}</section>
      <section className={panelClass}><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-5 w-5" /></span><div><h2 className="text-base font-black sm:text-lg">Identity and registration documents</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Use secure document-store links; avoid public links for personal identity documents.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}>Identity document HTTPS URL *<input required type="url" value={initial.identityDocumentUrl} onChange={(e) => changeInitial("identityDocumentUrl", e.target.value)} placeholder="https://secure-storage/..." className={inputClass} /></label><label className={labelClass}>Vehicle registration document HTTPS URL *<input required type="url" value={initial.vehicleDocumentUrl} onChange={(e) => changeInitial("vehicleDocumentUrl", e.target.value)} placeholder="https://secure-storage/..." className={inputClass} /></label></div></section>
      <section className={panelClass}><div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Truck className="h-5 w-5" /></span><div><h2 className="text-base font-black sm:text-lg">Vehicle photo set — 4 angles</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Provide a clear front, right, left and back photo of the exact registered vehicle.</p></div></div><div className="mt-4">{photoInputs(initial, setInitial, "Vehicle ")}</div></section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><Link to="/driver" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50">Back to overview</Link><button disabled={saving || vehicleOptions.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Submitting profile…" : "Submit for admin approval"}</button></div>
    </form> : <div className="space-y-5">
      <section className={`${panelClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${profile.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700" : profile.approvalStatus === "rejected" || profile.approvalStatus === "suspended" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}><BadgeCheck className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black sm:text-lg">Verification status</h2><span className={`rounded-full border px-3 py-1 text-xs font-extrabold capitalize ${statusStyles(profile.approvalStatus)}`}>{profile.approvalStatus}</span><span className={`rounded-full border px-3 py-1 text-xs font-extrabold capitalize ${profile.availability === "online" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : profile.availability === "busy" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{profile.availability}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{profile.approvalStatus === "approved" ? "Your submitted licence and identity details are approved and locked." : profile.approvalStatus === "rejected" ? "Review the admin note below and send a change request; submitted details cannot be edited directly." : profile.approvalStatus === "suspended" ? "Your driver profile is suspended. Contact the administrator." : "Your profile is under admin review. You cannot go online until approval."}</p>{profile.rejectionReason && <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><strong>Admin note:</strong> {profile.rejectionReason}</p>}</div></div><Link to="/driver/vehicles" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">Vehicle details <Truck className="h-4 w-4" /></Link></section>
      <section className={panelClass}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black sm:text-lg">Driving licence record</h2><p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">Your verified details are read-only. Submit a change request if something must change.</p></div><button type="button" onClick={() => setShowChangeForm((open) => !open)} disabled={profile.profileChangeRequest?.status === "pending" || profile.approvalStatus === "suspended"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#101c30] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#1b2d48] disabled:opacity-50"><Pencil className="h-4 w-4" />{showChangeForm ? "Hide request" : "Request a change"}</button></div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><table className="w-full table-fixed text-left text-sm"><tbody className="divide-y divide-slate-100"><tr><th className="w-[42%] bg-slate-50 px-3 py-3 font-bold text-slate-600 sm:px-4">Licence number</th><td className="break-words px-3 py-3 font-extrabold text-slate-900 sm:px-4">{profile.licenseNumber}</td></tr><tr><th className="bg-slate-50 px-3 py-3 font-bold text-slate-600 sm:px-4">Expiry date</th><td className="break-words px-3 py-3 font-extrabold text-slate-900 sm:px-4">{new Date(profile.licenseExpiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr><tr><th className="bg-slate-50 px-3 py-3 font-bold text-slate-600 sm:px-4">Document</th><td className="break-words px-3 py-3 sm:px-4">{profile.documents?.licenseDocumentUrl ? <a href={profile.documents.licenseDocumentUrl} target="_blank" rel="noreferrer" className="font-bold text-orange-700 underline">Open stored document</a> : <span className="text-slate-500">Not submitted</span>}</td></tr></tbody></table></div>
        {profile.profileChangeRequest && <div className={`mt-4 rounded-xl border p-4 ${profile.profileChangeRequest.status === "pending" ? "border-amber-200 bg-amber-50" : profile.profileChangeRequest.status === "approved" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}><p className="text-sm font-extrabold">Last change request: <span className="capitalize">{profile.profileChangeRequest.status}</span></p><p className="mt-1 text-xs leading-5">{profile.profileChangeRequest.reason || "No additional note."} {profile.profileChangeRequest.reviewNote ? `— Admin: ${profile.profileChangeRequest.reviewNote}` : ""}</p></div>}
        {showChangeForm && <form onSubmit={submitChangeRequest} className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/50 p-4 sm:p-5"><h3 className="font-black">Request admin approval for a change</h3><p className="mt-1 text-xs leading-5 text-slate-600">Your current data will not change until an administrator approves this request.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}>Requested licence number<input required minLength={5} maxLength={30} value={change.licenseNumber} onChange={(e) => setChange((old) => ({ ...old, licenseNumber: e.target.value.toUpperCase() }))} className={inputClass} /></label><label className={labelClass}>Requested expiry date<input required type="date" min={today()} value={change.licenseExpiry} onChange={(e) => setChange((old) => ({ ...old, licenseExpiry: e.target.value }))} className={inputClass} /></label><label className={labelClass}>New licence document HTTPS URL<input required type="url" value={change.licenseDocumentUrl} onChange={(e) => setChange((old) => ({ ...old, licenseDocumentUrl: e.target.value }))} className={inputClass} /></label><label className={labelClass}>New identity document HTTPS URL<input required type="url" value={change.identityDocumentUrl} onChange={(e) => setChange((old) => ({ ...old, identityDocumentUrl: e.target.value }))} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>Reason for request<textarea required minLength={5} maxLength={500} rows={3} value={change.reason} onChange={(e) => setChange((old) => ({ ...old, reason: e.target.value }))} className={inputClass} placeholder="Explain why these details need to change." /></label></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Submit change request</button><button type="button" onClick={() => setShowChangeForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Cancel</button></div></form>}
        {profile.profileChangeRequest?.status === "pending" && <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-amber-800"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />A change request is waiting for the administrator. You cannot submit another until it is reviewed.</p>}
      </section>
      <div className="grid gap-4 md:grid-cols-2"><section className={panelClass}><h2 className="font-black">Primary vehicle</h2><p className="mt-1 text-xs leading-5 text-slate-500">Manage vehicle details and additional vehicles on the separate Vehicle Details page.</p><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3 border-b border-slate-100 py-2"><dt className="text-slate-500">Category</dt><dd className="text-right font-bold">{profile.vehicleType}</dd></div><div className="flex justify-between gap-3 border-b border-slate-100 py-2"><dt className="text-slate-500">Make / model</dt><dd className="text-right font-bold">{profile.vehicleMakeModel}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-slate-500">Registration</dt><dd className="text-right font-bold">{profile.vehicleRegistration}</dd></div></dl><Link to="/driver/vehicles" className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700 hover:underline">Manage vehicle <Truck className="h-4 w-4" /></Link></section><section className={panelClass}><div className="flex items-center gap-2"><Info className="h-5 w-5 text-blue-700" /><h2 className="font-black">Verification rules</h2></div><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><li>• Licence and identity data are locked after submission.</li><li>• Vehicle details/photos can only be changed by submitting a change request.</li><li>• Additional vehicles require separate admin approval.</li><li>• Use private/controlled-access storage URLs for identity documents.</li></ul><Link to="/driver/documents" className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700 hover:underline">View all documents <FileText className="h-4 w-4" /></Link></section></div>
    </div>}
  </div></main>;
}
