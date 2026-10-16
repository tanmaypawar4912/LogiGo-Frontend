import { useCallback, useEffect, useState, type Dispatch, type SetStateAction, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, LoaderCircle, Plus, RefreshCw, Save, ShieldCheck, Truck } from "lucide-react";
import api from "../../services/api";
import { getDriverError } from "../../hooks/useDriverJobs";
import VehiclePhotoUploader, { type VehiclePhotoView } from "../../components/driver/VehiclePhotoUploader";

interface VehicleOption { _id: string; name: string; slug: string; capacityKg: number; imageUrl?: string | null; }
interface Photos { front: string; right: string; left: string; back: string; }
interface VehicleItem { _id: string; vehicleType: string; vehicleMakeModel: string; vehicleRegistration: string; vehicleCapacityKg: number; vehicleDocumentUrl?: string; photos?: Partial<Photos>; approvalStatus: "pending" | "approved" | "rejected" | "suspended"; isPrimary: boolean; rejectionReason?: string; changeRequest?: { status: "pending" | "approved" | "rejected"; reason?: string; reviewNote?: string } | null; }
interface DriverProfileBrief { approvalStatus: string; isActive: boolean; availability: string; vehicleRegistration: string; }
interface VehicleForm { vehicleType: string; vehicleMakeModel: string; vehicleRegistration: string; vehicleCapacityKg: string; vehicleDocumentUrl: string; front: string; right: string; left: string; back: string; reason: string; }
const emptyForm: VehicleForm = { vehicleType: "", vehicleMakeModel: "", vehicleRegistration: "", vehicleCapacityKg: "", vehicleDocumentUrl: "", front: "", right: "", left: "", back: "", reason: "" };
const input = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const label = "block text-xs font-extrabold text-slate-700 sm:text-sm";
function httpsUrl(value: string) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function tone(status: VehicleItem["approvalStatus"]) { return status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "rejected" || status === "suspended" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; }
function VehiclePhotos({ photos }: { photos?: Partial<Photos> }) {
  const entries: { key: keyof Photos; name: string }[] = [{ key: "front", name: "Front" }, { key: "right", name: "Right side" }, { key: "left", name: "Left side" }, { key: "back", name: "Back" }];
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{entries.map((entry) => <div key={entry.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="flex h-24 items-center justify-center sm:h-28">{photos?.[entry.key] && httpsUrl(photos[entry.key]!) ? <img src={photos[entry.key]} alt={`${entry.name} vehicle view`} loading="lazy" className="h-full w-full object-contain" /> : <div className="text-center text-slate-400"><ImagePlus className="mx-auto h-5 w-5" /><p className="mt-1 text-[10px] font-semibold">Photo not added</p></div>}</div><p className="border-t border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{entry.name}</p></div>)}</div>;
}

export default function DriverVehicleDetails() {
  const [profile, setProfile] = useState<DriverProfileBrief | null>(null);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [catalog, setCatalog] = useState<VehicleOption[]>([]);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [editTarget, setEditTarget] = useState<VehicleItem | null>(null);
  const [editForm, setEditForm] = useState<VehicleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [profileRes, vehiclesRes, catalogRes] = await Promise.all([api.get("/drivers/profile"), api.get("/drivers/vehicles"), api.get("/vehicles")]);
      if (!profileRes.data?.success || !vehiclesRes.data?.success || !catalogRes.data?.success) throw new Error("Unable to load all vehicle details.");
      setProfile(profileRes.data.profile as DriverProfileBrief);
      setVehicles(Array.isArray(vehiclesRes.data.vehicles) ? vehiclesRes.data.vehicles : []);
      setCatalog(Array.isArray(catalogRes.data.vehicles) ? catalogRes.data.vehicles : []);
    } catch (e: unknown) { setError(getDriverError(e, "Unable to load registered vehicles.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function updateForm(setter: (action: (current: VehicleForm) => VehicleForm) => void, key: keyof VehicleForm, value: string) { setter((current) => ({ ...current, [key]: value })); }
  function validateVehicle(values: VehicleForm, isChange: boolean) {
    if ([values.vehicleType, values.vehicleMakeModel.trim(), values.vehicleRegistration.trim(), values.vehicleCapacityKg, values.vehicleDocumentUrl, values.front, values.right, values.left, values.back].some((value) => !value.trim())) return "Complete all vehicle details, document link and the four photo links.";
    if ([values.vehicleDocumentUrl, values.front, values.right, values.left, values.back].some((url) => !httpsUrl(url))) return "Vehicle document and all four photo links must use HTTPS.";
    if (!Number.isFinite(Number(values.vehicleCapacityKg)) || Number(values.vehicleCapacityKg) < 1 || Number(values.vehicleCapacityKg) > 50000) return "Enter a valid vehicle carrying capacity from 1 to 50,000 kg.";
    if (isChange && values.reason.trim().length < 5) return "Provide a reason of at least 5 characters for the change request.";
    return "";
  }
  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const invalid = validateVehicle(form, false); if (invalid) { setError(invalid); return; }
    setSaving(true);
    try {
      const response = await api.post("/drivers/vehicles", { vehicleType: form.vehicleType, vehicleMakeModel: form.vehicleMakeModel.trim(), vehicleRegistration: form.vehicleRegistration.trim().toUpperCase(), vehicleCapacityKg: Number(form.vehicleCapacityKg), vehicleDocumentUrl: form.vehicleDocumentUrl.trim(), photos: { front: form.front.trim(), right: form.right.trim(), left: form.left.trim(), back: form.back.trim() } });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not submit vehicle.");
      setNotice(response.data.message || "Vehicle submitted for admin approval."); setForm(emptyForm); await load();
    } catch (e: unknown) { setError(getDriverError(e, "Unable to submit vehicle.")); }
    finally { setSaving(false); }
  }
  async function selectVehicle(vehicleId: string) {
    setError(""); setNotice(""); setSelecting(vehicleId);
    try { const response = await api.patch(`/drivers/vehicles/${vehicleId}/select`); if (!response.data?.success) throw new Error(response.data?.message || "Could not select this vehicle."); setNotice("Active vehicle updated. Dispatch will use this approved vehicle for your driver profile."); await load(); }
    catch (e: unknown) { setError(getDriverError(e, "Unable to select vehicle.")); }
    finally { setSelecting(null); }
  }
  function beginChangeRequest(vehicle: VehicleItem) {
    setEditTarget(vehicle);
    setEditForm({ vehicleType: vehicle.vehicleType, vehicleMakeModel: vehicle.vehicleMakeModel, vehicleRegistration: vehicle.vehicleRegistration, vehicleCapacityKg: String(vehicle.vehicleCapacityKg), vehicleDocumentUrl: vehicle.vehicleDocumentUrl || "", front: vehicle.photos?.front || "", right: vehicle.photos?.right || "", left: vehicle.photos?.left || "", back: vehicle.photos?.back || "", reason: "" });
  }
  async function submitChangeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editTarget) return; setError(""); setNotice("");
    const invalid = validateVehicle(editForm, true); if (invalid) { setError(invalid); return; }
    setSaving(true);
    try {
      const response = await api.post(`/drivers/vehicles/${editTarget._id}/change-request`, { vehicleType: editForm.vehicleType, vehicleMakeModel: editForm.vehicleMakeModel.trim(), vehicleRegistration: editForm.vehicleRegistration.trim().toUpperCase(), vehicleCapacityKg: Number(editForm.vehicleCapacityKg), vehicleDocumentUrl: editForm.vehicleDocumentUrl.trim(), photos: { front: editForm.front.trim(), right: editForm.right.trim(), left: editForm.left.trim(), back: editForm.back.trim() }, reason: editForm.reason.trim() });
      if (!response.data?.success) throw new Error(response.data?.message || "Could not submit vehicle change request.");
      setNotice(response.data.message || "Vehicle change request submitted."); setEditTarget(null); await load();
    } catch (e: unknown) { setError(getDriverError(e, "Unable to submit vehicle change request.")); }
    finally { setSaving(false); }
  }
  const allowAdd = profile?.approvalStatus === "approved" && profile.isActive;

  return <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1450px]">
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">Fleet and vehicles</p><h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.65rem)] font-black tracking-tight">Vehicle details</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Your primary vehicle, approved alternatives and pending vehicle requests. Every registered vehicle has four photo angles.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    {error && <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{error}</div>}{notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{notice}</div>}
    {!allowAdd && !loading && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Vehicle actions are restricted.</strong> Your driver profile must be approved and active before adding or switching vehicles. You can still view existing details.</div>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" /><p className="mt-3 text-sm text-slate-500">Loading your vehicles…</p></div> : <section className="space-y-4">{vehicles.map((vehicle) => <article key={vehicle._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Truck className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{vehicle.vehicleMakeModel}</h2>{vehicle.isPrimary && <span className="rounded-full bg-[#101c30] px-2.5 py-1 text-[10px] font-extrabold text-white">Active vehicle</span>}<span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold capitalize ${tone(vehicle.approvalStatus)}`}>{vehicle.approvalStatus}</span></div><p className="mt-1 text-sm text-slate-500">{vehicle.vehicleType} · {vehicle.vehicleRegistration} · {vehicle.vehicleCapacityKg.toLocaleString("en-IN")} kg</p>{vehicle.rejectionReason && <p className="mt-2 text-xs font-bold text-rose-700">Admin note: {vehicle.rejectionReason}</p>}{vehicle.changeRequest && <p className={`mt-2 text-xs font-bold ${vehicle.changeRequest.status === "pending" ? "text-amber-700" : vehicle.changeRequest.status === "approved" ? "text-emerald-700" : "text-rose-700"}`}>Change request: {vehicle.changeRequest.status}{vehicle.changeRequest.reviewNote ? ` — ${vehicle.changeRequest.reviewNote}` : ""}</p>}</div></div><div className="flex flex-wrap gap-2">{vehicle.approvalStatus === "approved" && !vehicle.isPrimary && <button type="button" onClick={() => void selectVehicle(vehicle._id)} disabled={!allowAdd || selecting === vehicle._id} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-xs font-extrabold text-white hover:bg-orange-600 disabled:opacity-50">{selecting === vehicle._id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Set active</button>}{vehicle.approvalStatus === "approved" && vehicle.changeRequest?.status !== "pending" && <button type="button" onClick={() => beginChangeRequest(vehicle)} disabled={!allowAdd} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />Request a change</button>}</div></div><div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"><div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full table-fixed text-left text-sm"><tbody className="divide-y divide-slate-100">{[["Category", vehicle.vehicleType], ["Registration", vehicle.vehicleRegistration], ["Capacity", `${vehicle.vehicleCapacityKg.toLocaleString("en-IN")} kg`], ["Registration document", vehicle.vehicleDocumentUrl ? "Submitted" : "Not added"]].map(([k, v]) => <tr key={k}><th className="w-[42%] bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 sm:px-4">{k}</th><td className="break-words px-3 py-3 text-xs font-extrabold sm:px-4">{k === "Registration document" && vehicle.vehicleDocumentUrl ? <a href={vehicle.vehicleDocumentUrl} target="_blank" rel="noreferrer" className="text-orange-700 underline">Open document</a> : v}</td></tr>)}</tbody></table></div><div><p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">Required vehicle photo set</p><VehiclePhotos photos={vehicle.photos} /></div></div></article>)}</section>}

    {editTarget && <section className="mt-5 rounded-3xl border border-orange-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">Admin approval required</p><h2 className="mt-1 text-lg font-black">Request changes to {editTarget.vehicleMakeModel}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Your current details stay active until this request is approved.</p></div><button type="button" onClick={() => setEditTarget(null)} className="self-start rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button></div><form onSubmit={submitChangeRequest} className="mt-5 space-y-4"><VehicleFormFields form={editForm} setForm={setEditForm} catalog={catalog} includeReason /><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Submit change request</button></form></section>}

    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Plus className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Add another vehicle</h2><p className="mt-1 text-sm leading-6 text-slate-600">New registrations remain pending until an administrator verifies the vehicle document and all four photos.</p></div></div><form onSubmit={addVehicle} className="mt-5 space-y-4"><fieldset disabled={!allowAdd || saving} className="space-y-4"><VehicleFormFields form={form} setForm={setForm} catalog={catalog} /><button disabled={!allowAdd || saving || catalog.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101c30] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#1b2d48] disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Submit new vehicle for approval</button></fieldset></form></section>
  </div></main>;
}

function VehicleFormFields({ form, setForm, catalog, includeReason = false }: { form: VehicleForm; setForm: Dispatch<SetStateAction<VehicleForm>>; catalog: VehicleOption[]; includeReason?: boolean }) {
  const update = (key: keyof VehicleForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const photoFields: { key: "front" | "right" | "left" | "back"; title: string }[] = [{ key: "front", title: "Front" }, { key: "right", title: "Right side" }, { key: "left", title: "Left side" }, { key: "back", title: "Back" }];
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><label className={label}>Vehicle category *<select required value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} className={input}><option value="">Select category</option>{catalog.map((vehicle) => <option value={vehicle.slug} key={vehicle._id}>{vehicle.name} · {vehicle.capacityKg} kg</option>)}</select></label><label className={label}>Make / model *<input required minLength={2} maxLength={100} value={form.vehicleMakeModel} onChange={(e) => update("vehicleMakeModel", e.target.value)} className={input} placeholder="e.g. Tata Ace Gold" /></label><label className={label}>Registration number *<input required minLength={4} maxLength={30} value={form.vehicleRegistration} onChange={(e) => update("vehicleRegistration", e.target.value.toUpperCase())} className={input} placeholder="MH12AB1234" /></label><label className={label}>Capacity (kg) *<input required type="number" min={1} max={50000} value={form.vehicleCapacityKg} onChange={(e) => update("vehicleCapacityKg", e.target.value)} className={input} placeholder="750" /></label></div>
    <label className={label}>Vehicle registration document HTTPS URL *<input required type="url" value={form.vehicleDocumentUrl} onChange={(e) => update("vehicleDocumentUrl", e.target.value)} className={input} placeholder="https://..." /></label>
    <div>
      <div className="mb-3">
        <p className="text-xs font-extrabold text-slate-700 sm:text-sm">Vehicle photos — all four views required</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Select real photos and upload them to Cloudinary. Each upload is registered in MongoDB, and the Cloudinary image URL is linked to this vehicle.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {photoFields.map((photo) => (
          <VehiclePhotoUploader
            key={photo.key}
            title={photo.title}
            view={photo.key as VehiclePhotoView}
            value={form[photo.key]}
            required
            onUploaded={(url) => update(photo.key, url)}
          />
        ))}
      </div>
    </div>
    {includeReason && <label className={label}>Why do you need to change this vehicle? *<textarea required minLength={5} maxLength={500} rows={3} value={form.reason} onChange={(e) => update("reason", e.target.value)} className={input} placeholder="Explain the change request." /></label>}
  </>;
}
