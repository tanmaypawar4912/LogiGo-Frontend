import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
  type ChangeEvent,
} from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Save,
  Truck,
  Upload,
} from "lucide-react";
import api from "../../services/api";
import { getDriverError } from "../../hooks/useDriverJobs";
import VehiclePhotoUploader, {
  type VehiclePhotoView,
} from "../../components/driver/VehiclePhotoUploader";

interface VehicleOption {
  _id: string;
  name: string;
  slug: string;
  capacityKg: number;
  imageUrl?: string | null;
}

interface Photos {
  front: string;
  right: string;
  left: string;
  back: string;
}

interface VehicleItem {
  _id: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: number;
  vehicleDocumentUrl?: string | null;
  vehicleDocumentAssetId?: string | null;
  photos?: Partial<Photos>;
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  isPrimary: boolean;
  rejectionReason?: string;
}

interface DriverProfileBrief {
  approvalStatus: string;
  isActive: boolean;
  availability: string;
  vehicleRegistration: string;
  vehiclePhotos?: Partial<Photos>;
  documents?: {
    vehicleDocumentAssetId?: string | null;
    vehicleDocumentUrl?: string | null;
  };
}

interface VehicleForm {
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: string;
  vehicleDocumentAssetId: string;
  vehicleDocumentUrl: string;
  front: string;
  right: string;
  left: string;
  back: string;
  }

const emptyForm: VehicleForm = {
  vehicleType: "",
  vehicleMakeModel: "",
  vehicleRegistration: "",
  vehicleCapacityKg: "",
  vehicleDocumentAssetId: "",
  vehicleDocumentUrl: "",
  front: "",
  right: "",
  left: "",
  back: "",
};

const input =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

const label = "block text-xs font-extrabold text-slate-700 sm:text-sm";

function httpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function tone(status: VehicleItem["approvalStatus"]) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rejected" || status === "suspended") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function VehiclePhotos({ photos }: { photos?: Partial<Photos> }) {
  const entries: { key: keyof Photos; name: string }[] = [
    { key: "front", name: "Front" },
    { key: "right", name: "Right side" },
    { key: "left", name: "Left side" },
    { key: "back", name: "Back" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
        >
          <div className="flex h-24 items-center justify-center sm:h-28">
            {photos?.[entry.key] && httpsUrl(photos[entry.key]!) ? (
              <img
                src={photos[entry.key]!}
                alt={`${entry.name} vehicle view`}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImagePlus className="mx-auto h-5 w-5" />
                <p className="mt-1 text-[10px] font-semibold">
                  Photo not added
                </p>
              </div>
            )}
          </div>
          <p className="border-t border-slate-200 bg-white px-2 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            {entry.name}
          </p>
        </div>
      ))}
    </div>
  );
}

function VehicleDocumentUploader({
  value,
  legacyUrl,
  onUploaded,
  required = false,
  disabled = false,
}: {
  value: string;
  legacyUrl?: string | null;
  onUploaded: (assetId: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Image size must be 8 MB or less.");
      event.target.value = "";
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("kind", "vehicle-document");

    setUploading(true);

    try {
      const response = await api.post("/drivers/media/upload", data);

      if (!response.data?.success || !response.data?.asset?.assetId) {
        throw new Error(
          response.data?.message || "Unable to upload vehicle document."
        );
      }

      onUploaded(response.data.asset.assetId);
      setFilename(file.name);
    } catch (uploadError: unknown) {
      setError(
        getDriverError(uploadError, "Unable to upload vehicle document.")
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const hasDocument = Boolean(value || legacyUrl);

  return (
    <div>
      <p className={label}>
        Vehicle registration document {required ? "*" : ""}
      </p>

      <div className="mt-1.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <FileImage className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-800">
              Upload registration document
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Upload a clear image of your vehicle registration document.
              JPG, PNG and WEBP · Maximum 8 MB.
            </p>

            {hasDocument && (
              <p className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {filename || "Document attached"}
              </p>
            )}

            <label
              className={`mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#101c30] px-3.5 py-2.5 text-xs font-extrabold text-white hover:bg-[#1b2d48] ${
                disabled || uploading
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              {uploading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading
                ? "Uploading..."
                : hasDocument
                  ? "Upload replacement"
                  : "Choose image"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={disabled || uploading}
                required={required && !hasDocument}
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DriverVehicleDetails() {
  const [profile, setProfile] = useState<DriverProfileBrief | null>(null);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [catalog, setCatalog] = useState<VehicleOption[]>([]);
  const [editTarget, setEditTarget] = useState<VehicleItem | null>(null);
  const [editForm, setEditForm] = useState<VehicleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingDocument, setOpeningDocument] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, vehiclesRes, catalogRes] = await Promise.all([
        api.get("/drivers/profile"),
        api.get("/drivers/vehicles"),
        api.get("/vehicles"),
      ]);

      if (
        !profileRes.data?.success ||
        !vehiclesRes.data?.success ||
        !catalogRes.data?.success
      ) {
        throw new Error("Unable to load all vehicle details.");
      }

      setProfile(profileRes.data.profile as DriverProfileBrief);
      setVehicles(
        Array.isArray(vehiclesRes.data.vehicles)
          ? vehiclesRes.data.vehicles
          : []
      );
      setCatalog(
        Array.isArray(catalogRes.data.vehicles)
          ? catalogRes.data.vehicles
          : []
      );
    } catch (loadError: unknown) {
      setError(
        getDriverError(loadError, "Unable to load registered vehicles.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function validateVehicle(values: VehicleForm) {
    const missingBasicDetails = [
      values.vehicleType,
      values.vehicleMakeModel.trim(),
      values.vehicleRegistration.trim(),
      values.vehicleCapacityKg,
      values.front,
      values.right,
      values.left,
      values.back,
    ].some((value) => !value.trim());

    if (missingBasicDetails) {
      return "Complete all vehicle details and upload all four vehicle photos.";
    }

    if (!values.vehicleDocumentAssetId && !values.vehicleDocumentUrl) {
      return "Upload the vehicle registration document image.";
    }

    if (
      values.vehicleDocumentUrl &&
      !values.vehicleDocumentAssetId &&
      !httpsUrl(values.vehicleDocumentUrl)
    ) {
      return "The existing vehicle document URL is invalid.";
    }

    if (
      [values.front, values.right, values.left, values.back].some(
        (url) => !httpsUrl(url)
      )
    ) {
      return "All four vehicle photos must use HTTPS URLs.";
    }

    if (
      !Number.isFinite(Number(values.vehicleCapacityKg)) ||
      Number(values.vehicleCapacityKg) < 1 ||
      Number(values.vehicleCapacityKg) > 50000
    ) {
      return "Enter a valid vehicle carrying capacity from 1 to 50,000 kg.";
    }

    return "";
  }

  function vehiclePayload(values: VehicleForm) {
    return {
      vehicleType: values.vehicleType,
      vehicleMakeModel: values.vehicleMakeModel.trim(),
      vehicleRegistration: values.vehicleRegistration.trim().toUpperCase(),
      vehicleCapacityKg: Number(values.vehicleCapacityKg),
      vehicleDocumentAssetId: values.vehicleDocumentAssetId || undefined,
      // Legacy URL retained only for existing records until migrated.
      vehicleDocumentUrl: values.vehicleDocumentAssetId
        ? ""
        : values.vehicleDocumentUrl.trim(),
      photos: {
        front: values.front.trim(),
        right: values.right.trim(),
        left: values.left.trim(),
        back: values.back.trim(),
      },
    };
  }

  function beginVehicleEdit(vehicle: VehicleItem) {
    setEditTarget(vehicle);

    setEditForm({
      vehicleType: vehicle.vehicleType,
      vehicleMakeModel: vehicle.vehicleMakeModel,
      vehicleRegistration: vehicle.vehicleRegistration,
      vehicleCapacityKg: String(vehicle.vehicleCapacityKg),
      vehicleDocumentAssetId:
        vehicle.vehicleDocumentAssetId || profile?.documents?.vehicleDocumentAssetId || "",
      vehicleDocumentUrl:
        vehicle.vehicleDocumentUrl || profile?.documents?.vehicleDocumentUrl || "",
      front: vehicle.photos?.front || profile?.vehiclePhotos?.front || "",
      right: vehicle.photos?.right || profile?.vehiclePhotos?.right || "",
      left: vehicle.photos?.left || profile?.vehiclePhotos?.left || "",
      back: vehicle.photos?.back || profile?.vehiclePhotos?.back || "",
    });
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editTarget) return;

    setError("");
    setNotice("");

    const invalid = validateVehicle(editForm);

    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch(
        `/drivers/vehicles/${editTarget._id}`,
        vehiclePayload(editForm)
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Could not update vehicle details."
        );
      }

      setNotice(
        response.data.message || "Vehicle details saved successfully."
      );
      setEditTarget(null);
      await load();
    } catch (changeError: unknown) {
      setError(
        getDriverError(changeError, "Unable to update vehicle details.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function openVehicleDocument(vehicle: VehicleItem) {
    setError("");

    const assetId =
      vehicle.vehicleDocumentAssetId || profile?.documents?.vehicleDocumentAssetId;
    const legacyUrl =
      vehicle.vehicleDocumentUrl || profile?.documents?.vehicleDocumentUrl;

    if (!assetId) {
      if (legacyUrl && httpsUrl(legacyUrl)) {
        window.open(legacyUrl, "_blank", "noopener,noreferrer");
        return;
      }

      setError("No registration document is attached to this vehicle.");
      return;
    }

    setOpeningDocument(vehicle._id);

    try {
      const response = await api.get(
        `/drivers/media/${assetId}/access`
      );

      const secureUrl = response.data?.url;

      if (!response.data?.success || !secureUrl) {
        throw new Error(
          response.data?.message || "Unable to open vehicle document."
        );
      }

      window.open(secureUrl, "_blank", "noopener,noreferrer");
    } catch (documentError: unknown) {
      setError(
        getDriverError(documentError, "Unable to open vehicle document.")
      );
    } finally {
      setOpeningDocument(null);
    }
  }

  const allowChange = profile?.approvalStatus !== "suspended" && profile?.isActive === true;
  const primaryVehicle =
    vehicles.find((vehicle) => vehicle.isPrimary) || vehicles[0] || null;
  const displayedVehicles = primaryVehicle ? [primaryVehicle] : [];

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1450px]">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">
              Fleet and vehicles
            </p>
            <h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.65rem)] font-black tracking-tight">
              Vehicle details
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Manage your single registered vehicle and all four photo angles. Saved updates apply directly to existing profiles; new driver onboarding still requires administrator approval.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          >
            {notice}
          </div>
        )}

        {!allowChange && !loading && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <strong>Vehicle actions are restricted.</strong> Your driver profile
            must be active before you can edit it. Initial onboarding still requires administrator approval before going online.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" />
            <p className="mt-3 text-sm text-slate-500">
              Loading your vehicles…
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {displayedVehicles.map((vehicle) => (
              <article
                key={vehicle._id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Truck className="h-5 w-5" />
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">
                          {vehicle.vehicleMakeModel}
                        </h2>

                        {vehicle.isPrimary && (
                          <span className="rounded-full bg-[#101c30] px-2.5 py-1 text-[10px] font-extrabold text-white">
                            Active vehicle
                          </span>
                        )}

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold capitalize ${tone(vehicle.approvalStatus)}`}
                        >
                          {vehicle.approvalStatus}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {vehicle.vehicleType} · {vehicle.vehicleRegistration} ·{" "}
                        {vehicle.vehicleCapacityKg.toLocaleString("en-IN")} kg
                      </p>

                      {vehicle.rejectionReason && (
                        <p className="mt-2 text-xs font-bold text-rose-700">
                          Admin note: {vehicle.rejectionReason}
                        </p>
                      )}

                      
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => beginVehicleEdit(vehicle)}
                      disabled={!allowChange}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Edit vehicle
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full table-fixed text-left text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {[
                          ["Category", vehicle.vehicleType],
                          ["Registration", vehicle.vehicleRegistration],
                          [
                            "Capacity",
                            `${vehicle.vehicleCapacityKg.toLocaleString("en-IN")} kg`,
                          ],
                        ].map(([key, value]) => (
                          <tr key={key}>
                            <th className="w-[42%] bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 sm:px-4">
                              {key}
                            </th>
                            <td className="break-words px-3 py-3 text-xs font-extrabold sm:px-4">
                              {value}
                            </td>
                          </tr>
                        ))}

                        <tr>
                          <th className="w-[42%] bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500 sm:px-4">
                            Registration document
                          </th>
                          <td className="break-words px-3 py-3 text-xs font-extrabold sm:px-4">
                            {vehicle.vehicleDocumentAssetId ||
                            vehicle.vehicleDocumentUrl ||
                            profile?.documents?.vehicleDocumentAssetId ||
                            profile?.documents?.vehicleDocumentUrl ? (
                              <button
                                type="button"
                                onClick={() => void openVehicleDocument(vehicle)}
                                disabled={openingDocument === vehicle._id}
                                className="inline-flex items-center gap-1.5 font-extrabold text-orange-700 underline disabled:opacity-50"
                              >
                                {openingDocument === vehicle._id ? (
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ExternalLink className="h-3.5 w-3.5" />
                                )}
                                Open document
                              </button>
                            ) : (
                              <span className="text-slate-400">Not added</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Required vehicle photo set
                    </p>
                    <VehiclePhotos
                      photos={{
                        front: vehicle.photos?.front || profile?.vehiclePhotos?.front || "",
                        right: vehicle.photos?.right || profile?.vehiclePhotos?.right || "",
                        left: vehicle.photos?.left || profile?.vehiclePhotos?.left || "",
                        back: vehicle.photos?.back || profile?.vehiclePhotos?.back || "",
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {editTarget && (
          <section className="mt-5 rounded-3xl border border-orange-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                  Direct vehicle update
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Edit {editTarget.vehicleMakeModel}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Changes save directly. After saving, you will be offline until you choose to go online again.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="self-start rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={saveVehicle}
              className="mt-5 space-y-4"
            >
              <VehicleFormFields
                form={editForm}
                setForm={setEditForm}
                catalog={catalog}
              />

              <button
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save vehicle details
              </button>
            </form>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-blue-950">One driver, one registered vehicle</h2>
              <p className="mt-1 text-sm leading-6 text-blue-900/80">
                LogiGo supports one registered vehicle per driver. You can edit its category, registration, registration document and photos directly. Saving changes signs you offline until you choose to go online again. New driver profiles must still receive initial administrator approval.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function VehicleFormFields({
  form,
  setForm,
  catalog,
}: {
  form: VehicleForm;
  setForm: Dispatch<SetStateAction<VehicleForm>>;
  catalog: VehicleOption[];
}) {
  const update = (key: keyof VehicleForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const photoFields: {
    key: "front" | "right" | "left" | "back";
    title: string;
  }[] = [
    { key: "front", title: "Front" },
    { key: "right", title: "Right side" },
    { key: "left", title: "Left side" },
    { key: "back", title: "Back" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className={label}>
          Vehicle category *
          <select
            required
            value={form.vehicleType}
            onChange={(event) => update("vehicleType", event.target.value)}
            className={input}
          >
            <option value="">Select category</option>
            {catalog.map((vehicle) => (
              <option value={vehicle.slug} key={vehicle._id}>
                {vehicle.name} · {vehicle.capacityKg} kg
              </option>
            ))}
          </select>
        </label>

        <label className={label}>
          Make / model *
          <input
            required
            minLength={2}
            maxLength={100}
            value={form.vehicleMakeModel}
            onChange={(event) =>
              update("vehicleMakeModel", event.target.value)
            }
            className={input}
            placeholder="e.g. Tata Ace Gold"
          />
        </label>

        <label className={label}>
          Registration number *
          <input
            required
            minLength={4}
            maxLength={30}
            value={form.vehicleRegistration}
            onChange={(event) =>
              update("vehicleRegistration", event.target.value.toUpperCase())
            }
            className={input}
            placeholder="MH12AB1234"
          />
        </label>

        <label className={label}>
          Capacity (kg) *
          <input
            required
            type="number"
            min={1}
            max={50000}
            value={form.vehicleCapacityKg}
            onChange={(event) =>
              update("vehicleCapacityKg", event.target.value)
            }
            className={input}
            placeholder="750"
          />
        </label>
      </div>

      <VehicleDocumentUploader
        value={form.vehicleDocumentAssetId}
        legacyUrl={form.vehicleDocumentUrl}
        required
        onUploaded={(assetId) => {
          update("vehicleDocumentAssetId", assetId);
          update("vehicleDocumentUrl", "");
        }}
      />

      <div>
        <div className="mb-3">
          <p className="text-xs font-extrabold text-slate-700 sm:text-sm">
            Vehicle photos — all four views required
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select real photos and upload them to Cloudinary. Each upload is
            registered in MongoDB and linked to this vehicle.
          </p>
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


    </>
  );
}