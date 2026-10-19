
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileImage,
  FileText,
  Info,
  LoaderCircle,
  Save,
  ShieldCheck,
  Truck,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
type DocumentKind =
  | "license-document"
  | "identity-document"
  | "vehicle-document";
type PhotoView = "front" | "right" | "left" | "back";

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

interface RegisteredVehicle {
  _id: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: number;
  vehicleDocumentUrl?: string | null;
  vehicleDocumentAssetId?: string | null;
  photos?: Partial<Photos>;
  isPrimary?: boolean;
  approvalStatus?: ApprovalStatus;
}

interface DriverProfileData {
  _id: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: number;
  documents: {
    licenseDocumentUrl?: string | null;
    identityDocumentUrl?: string | null;
    vehicleDocumentUrl?: string | null;
    licenseDocumentAssetId?: string | null;
    identityDocumentAssetId?: string | null;
    vehicleDocumentAssetId?: string | null;
  };
  vehiclePhotos?: Partial<Photos>;
  registeredVehicles?: RegisteredVehicle[];
  approvalStatus: ApprovalStatus;
  availability?: string;
  isActive: boolean;
  rejectionReason?: string;
}

interface ProfileForm {
  licenseNumber: string;
  licenseExpiry: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: string;
  licenseDocumentAssetId: string;
  identityDocumentAssetId: string;
  vehicleDocumentAssetId: string;
  licenseDocumentUrl: string;
  identityDocumentUrl: string;
  vehicleDocumentUrl: string;
  photos: Photos;
}

interface UploadResult {
  assetId: string;
  url?: string;
}

const emptyPhotos: Photos = {
  front: "",
  right: "",
  left: "",
  back: "",
};

const emptyForm: ProfileForm = {
  licenseNumber: "",
  licenseExpiry: "",
  vehicleType: "",
  vehicleMakeModel: "",
  vehicleRegistration: "",
  vehicleCapacityKg: "",
  licenseDocumentAssetId: "",
  identityDocumentAssetId: "",
  vehicleDocumentAssetId: "",
  licenseDocumentUrl: "",
  identityDocumentUrl: "",
  vehicleDocumentUrl: "",
  photos: { ...emptyPhotos },
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";

const labelClass = "mb-2 block text-sm font-bold text-slate-700";

const photoViews: { view: PhotoView; title: string; description: string }[] = [
  {
    view: "front",
    title: "Front view",
    description: "Show the complete front of your vehicle.",
  },
  {
    view: "right",
    title: "Right-side view",
    description: "Show the complete right side.",
  },
  {
    view: "left",
    title: "Left-side view",
    description: "Show the complete left side.",
  },
  {
    view: "back",
    title: "Rear view",
    description: "Show the complete rear of your vehicle.",
  },
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          errors?: { field?: string; message?: string }[];
        }
      | undefined;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors
        .map((item) =>
          item.field ? `${item.field}: ${item.message}` : item.message
        )
        .filter(Boolean)
        .join(" · ");
    }

    return (
      data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Could not connect to LogiGo. Check that the backend server is running."
        : fallback)
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function statusTone(status: ApprovalStatus): string {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "rejected" || status === "suspended") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function DocumentImageUploader({
  title,
  description,
  kind,
  assetId,
  legacyUrl,
  disabled,
  onUploaded,
}: {
  title: string;
  description: string;
  kind: DocumentKind;
  assetId: string;
  legacyUrl?: string | null;
  disabled: boolean;
  onUploaded: (assetId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  const hasDocument = Boolean(assetId || legacyUrl);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
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
    data.append("kind", kind);

    setUploading(true);

    try {
      const response = await api.post("/drivers/media/upload", data);
      const uploadedAssetId = response.data?.asset?.assetId;

      if (!response.data?.success || !uploadedAssetId) {
        throw new Error(
          response.data?.message || "The document upload did not complete."
        );
      }

      onUploaded(uploadedAssetId);
      setFilename(file.name);
    } catch (uploadError: unknown) {
      setError(
        getErrorMessage(uploadError, `Unable to upload ${title.toLowerCase()}.`)
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <FileImage className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-800">
            {title} *
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

          {hasDocument && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-emerald-800">
                  Document attached
                </p>
                <p className="mt-1 break-words text-xs text-emerald-700">
                  {filename || (assetId ? "Uploaded image saved" : "Existing document")}
                </p>
              </div>
            </div>
          )}

          <label
            className={`mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#101c30] px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1b2d48] ${
              disabled || uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}

            {uploading
              ? "Uploading image..."
              : hasDocument
                ? "Upload replacement"
                : "Choose image"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled || uploading}
              onChange={handleFileChange}
            />
          </label>

          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            JPG, PNG or WEBP · Maximum 8 MB
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function VehiclePhotoUploader({
  view,
  title,
  description,
  url,
  disabled,
  onUploaded,
}: {
  view: PhotoView;
  title: string;
  description: string;
  url: string;
  disabled: boolean;
  onUploaded: (view: PhotoView, result: UploadResult) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
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
    data.append("kind", "vehicle-photo");
    data.append("view", view);

    setUploading(true);

    try {
      const response = await api.post("/drivers/media/upload", data);
      const asset = response.data?.asset;

      if (
        !response.data?.success ||
        !asset?.assetId ||
        !asset?.url ||
        !isHttpsUrl(asset.url)
      ) {
        throw new Error(
          response.data?.message ||
            `The ${view} vehicle photo did not return a valid HTTPS URL and asset ID.`
        );
      }

      onUploaded(view, {
        assetId: asset.assetId,
        url: asset.url,
      });
      setFilename(file.name);
    } catch (uploadError: unknown) {
      setError(
        getErrorMessage(uploadError, `Unable to upload the ${view} photo.`)
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileImage className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-800">
            {title} *
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

          {url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={url}
                alt={`${title} preview`}
                className="h-40 w-full object-contain"
                loading="lazy"
              />
              <div className="flex items-center gap-2 border-t border-slate-200 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 break-words text-xs text-slate-600">
                  {filename || "Vehicle photo attached"}
                </span>
              </div>
            </div>
          )}

          <label
            className={`mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#101c30] px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1b2d48] ${
              disabled || uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}

            {uploading ? "Uploading photo..." : url ? "Replace photo" : "Choose photo"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled || uploading}
              onChange={handleFileChange}
            />
          </label>

          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            JPG, PNG or WEBP · Maximum 8 MB
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function DriverProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [profile, setProfile] = useState<DriverProfileData | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [vehicleResult, profileResult] = await Promise.allSettled([
        api.get("/vehicles"),
        api.get("/drivers/profile"),
      ]);

      if (
        vehicleResult.status === "fulfilled" &&
        vehicleResult.value.data?.success
      ) {
        setVehicles(
          Array.isArray(vehicleResult.value.data.vehicles)
            ? vehicleResult.value.data.vehicles
            : []
        );
      } else {
        setVehicles([]);
      }

      if (
        profileResult.status === "fulfilled" &&
        profileResult.value.data?.success
      ) {
        const item = profileResult.value.data.profile as DriverProfileData;
        const primary =
          item.registeredVehicles?.find((vehicle) => vehicle.isPrimary) ||
          item.registeredVehicles?.[0];

        setProfile(item);
        setForm({
          ...emptyForm,
          licenseNumber: item.licenseNumber || "",
          licenseExpiry: item.licenseExpiry
            ? item.licenseExpiry.slice(0, 10)
            : "",
          vehicleType: item.vehicleType || primary?.vehicleType || "",
          vehicleMakeModel:
            item.vehicleMakeModel || primary?.vehicleMakeModel || "",
          vehicleRegistration:
            item.vehicleRegistration || primary?.vehicleRegistration || "",
          vehicleCapacityKg: String(
            item.vehicleCapacityKg ?? primary?.vehicleCapacityKg ?? ""
          ),
          licenseDocumentAssetId:
            item.documents?.licenseDocumentAssetId || "",
          identityDocumentAssetId:
            item.documents?.identityDocumentAssetId || "",
          vehicleDocumentAssetId:
            primary?.vehicleDocumentAssetId ||
            item.documents?.vehicleDocumentAssetId ||
            "",
          licenseDocumentUrl: item.documents?.licenseDocumentUrl || "",
          identityDocumentUrl: item.documents?.identityDocumentUrl || "",
          vehicleDocumentUrl:
            primary?.vehicleDocumentUrl ||
            item.documents?.vehicleDocumentUrl ||
            "",
          photos: {
            front:
              primary?.photos?.front || item.vehiclePhotos?.front || "",
            right:
              primary?.photos?.right || item.vehiclePhotos?.right || "",
            left:
              primary?.photos?.left || item.vehiclePhotos?.left || "",
            back:
              primary?.photos?.back || item.vehiclePhotos?.back || "",
          },
        });
      } else if (
        profileResult.status === "rejected" &&
        isAxiosError(profileResult.reason) &&
        profileResult.reason.response?.status === 404
      ) {
        setProfile(null);
        setForm({ ...emptyForm });
      } else if (profileResult.status === "rejected") {
        throw profileResult.reason;
      }
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Unable to load driver onboarding details.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  function updatePhoto(view: PhotoView, result: UploadResult) {
    if (!result.url) {
      setError(`The ${view} photo upload did not return a URL.`);
      return;
    }

    setForm((current) => ({
      ...current,
      photos: {
        ...current.photos,
        [view]: result.url!,
      },
    }));
    setError("");
    setNotice("");
  }

  function validateForm(): string | null {
    if (!form.licenseNumber.trim() || form.licenseNumber.trim().length < 5) {
      return "Enter a valid driving licence number (at least 5 characters).";
    }

    const expiry = new Date(form.licenseExpiry);
    if (!form.licenseExpiry || Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      return "Your driving licence expiry date must be in the future.";
    }

    if (!form.vehicleType) {
      return "Select a vehicle type from the active LogiGo vehicle catalogue.";
    }
    if (form.vehicleMakeModel.trim().length < 2) {
      return "Enter your vehicle make and model.";
    }
    if (
      form.vehicleRegistration.trim().length < 4 ||
      !/^[A-Za-z0-9 -]+$/.test(form.vehicleRegistration.trim())
    ) {
      return "Enter a valid vehicle registration number.";
    }

    const capacity = Number(form.vehicleCapacityKg);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50000) {
      return "Enter your vehicle's valid load capacity from 1 to 50,000 kg.";
    }

    if (!form.licenseDocumentAssetId && !isHttpsUrl(form.licenseDocumentUrl)) {
      return "Upload a driving licence image.";
    }
    if (!form.identityDocumentAssetId && !isHttpsUrl(form.identityDocumentUrl)) {
      return "Upload an identity document image.";
    }
    if (!form.vehicleDocumentAssetId && !isHttpsUrl(form.vehicleDocumentUrl)) {
      return "Upload a vehicle registration document image.";
    }

    const missingPhoto = photoViews.find(({ view }) => !isHttpsUrl(form.photos[view]));
    if (missingPhoto) {
      return `Upload a valid HTTPS vehicle photo for the ${missingPhoto.view} view.`;
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");
    setNotice("");

    if (!canEdit) {
      setError("This profile is suspended or inactive and cannot be edited.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const licenseNumber = form.licenseNumber.trim().toUpperCase();
    const vehicleRegistration = form.vehicleRegistration.trim().toUpperCase();
    const capacity = Number(form.vehicleCapacityKg);

    const documents = {
      licenseDocumentAssetId: form.licenseDocumentAssetId || undefined,
      identityDocumentAssetId: form.identityDocumentAssetId || undefined,
      vehicleDocumentAssetId: form.vehicleDocumentAssetId || undefined,
      licenseDocumentUrl: form.licenseDocumentAssetId ? "" : form.licenseDocumentUrl.trim(),
      identityDocumentUrl: form.identityDocumentAssetId ? "" : form.identityDocumentUrl.trim(),
      vehicleDocumentUrl: form.vehicleDocumentAssetId ? "" : form.vehicleDocumentUrl.trim(),
    };

    const payload = {
      licenseNumber,
      licenseExpiry: form.licenseExpiry,
      vehicleType: form.vehicleType,
      vehicleMakeModel: form.vehicleMakeModel.trim(),
      vehicleRegistration,
      vehicleCapacityKg: capacity,
      vehicleDocumentAssetId: form.vehicleDocumentAssetId || undefined,
      vehicleDocumentUrl: form.vehicleDocumentAssetId ? "" : form.vehicleDocumentUrl.trim(),
      photos: { ...form.photos },
      documents,
    };

    try {
      const response = profile
        ? await api.patch("/drivers/profile", payload)
        : await api.post("/drivers/profile", payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Could not save your driver profile.");
      }

      const updatedProfile = response.data.profile as DriverProfileData | undefined;
      if (updatedProfile) setProfile(updatedProfile);

      if (!profile) {
        setNotice(
          response.data.message ||
            "Your onboarding profile was submitted for initial administrator approval. You cannot go online until approved."
        );
        navigate("/driver", {
          replace: true,
          state: { onboardingSubmitted: true },
        });
        return;
      }

      setNotice(
        response.data.message ||
          (profile.approvalStatus === "approved"
            ? "Profile updated directly. You are offline until you go online again."
            : "Your onboarding details were updated. Initial administrator approval is still required.")
      );
      await loadPageData();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to save your driver profile."));
    } finally {
      setSaving(false);
    }
  }

  const selectedVehicle = vehicles.find(
    (item) => item.slug === form.vehicleType
  );

  const canEdit =
    profile?.approvalStatus !== "suspended" && profile?.isActive !== false;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/driver" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Truck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">
                LogiGo
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Driver onboarding
              </span>
            </span>
          </Link>

          <Link
            to="/driver"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-7 sm:px-6 sm:py-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-10">
        <section>
          <div className="mb-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">
              Driver verification
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {profile
                ? "Your driver profile"
                : `Welcome, ${user?.name || "driver"}`}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Manage your licence, vehicle and verification documents here. Initial onboarding requires administrator approval; existing approved drivers can save updates directly.
            </p>
          </div>

          {profile && (
            <div
              className={`mb-5 rounded-2xl border p-4 sm:p-5 ${statusTone(profile.approvalStatus)}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-extrabold">
                      Verification status:{" "}
                      {profile.approvalStatus.charAt(0).toUpperCase() +
                        profile.approvalStatus.slice(1)}
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      {profile.approvalStatus === "approved"
                        ? "You can update your details directly. Saving verification details signs you offline; go online again after the server validates your documents and photos."
                        : profile.approvalStatus === "rejected"
                          ? "Correct your onboarding details here and save again. Initial administrator approval is still required before going online."
                          : profile.approvalStatus === "suspended"
                            ? "This profile is suspended. Contact the LogiGo administrator."
                            : "Your initial onboarding is awaiting administrator approval. You can correct your details while it is pending."}
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-extrabold">
                  <Clock3 className="h-3.5 w-3.5" />
                  {profile.isActive ? "Account active" : "Account inactive"}
                </span>
              </div>

              {profile.rejectionReason && (
                <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm">
                  <strong>Admin note:</strong> {profile.rejectionReason}
                </p>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
            >
              {notice}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" />
              <p className="mt-3 text-sm text-slate-500">
                Loading your profile…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset
                disabled={!canEdit || saving}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-7"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black">
                      Driving licence details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Enter details exactly as printed on your licence.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="licenseNumber">
                      Licence number *
                    </label>
                    <input
                      className={inputClass}
                      id="licenseNumber"
                      required
                      minLength={5}
                      maxLength={30}
                      value={form.licenseNumber}
                      onChange={(event) =>
                        updateField("licenseNumber", event.target.value)
                      }
                      placeholder="Enter licence number"
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="licenseExpiry">
                      Licence expiry date *
                    </label>
                    <input
                      className={inputClass}
                      id="licenseExpiry"
                      required
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.licenseExpiry}
                      onChange={(event) =>
                        updateField("licenseExpiry", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <DocumentImageUploader
                    title="Driving licence image"
                    description="Upload a clear image of the front of your valid driving licence."
                    kind="license-document"
                    assetId={form.licenseDocumentAssetId}
                    legacyUrl={form.licenseDocumentUrl}
                    disabled={!canEdit || saving}
                    onUploaded={(assetId) => {
                      updateField("licenseDocumentAssetId", assetId);
                      updateField("licenseDocumentUrl", "");
                    }}
                  />
                </div>
              </fieldset>

              <fieldset
                disabled={!canEdit || saving}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-7"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black">Vehicle details</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Vehicle options are loaded from the admin-managed fleet
                      catalogue.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="vehicleType">
                      Vehicle type *
                    </label>
                    <select
                      className={inputClass}
                      id="vehicleType"
                      required
                      value={form.vehicleType}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateField("vehicleType", value);

                        const selected = vehicles.find(
                          (item) => item.slug === value
                        );
                        if (selected && !form.vehicleCapacityKg) {
                          updateField(
                            "vehicleCapacityKg",
                            String(selected.capacityKg)
                          );
                        }
                      }}
                    >
                      <option value="">Select a vehicle type</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle._id} value={vehicle.slug}>
                          {vehicle.name} ·{" "}
                          {vehicle.capacityKg.toLocaleString("en-IN")} kg
                        </option>
                      ))}
                    </select>

                    {vehicles.length === 0 && (
                      <p className="mt-1 text-xs text-amber-700">
                        No active vehicle types are available. Contact the
                        administrator.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="vehicleCapacityKg">
                      Vehicle load capacity (kg) *
                    </label>
                    <input
                      className={inputClass}
                      id="vehicleCapacityKg"
                      required
                      type="number"
                      min={1}
                      max={50000}
                      step={1}
                      value={form.vehicleCapacityKg}
                      onChange={(event) =>
                        updateField("vehicleCapacityKg", event.target.value)
                      }
                      placeholder="e.g. 750"
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="vehicleMakeModel">
                      Vehicle make and model *
                    </label>
                    <input
                      className={inputClass}
                      id="vehicleMakeModel"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.vehicleMakeModel}
                      onChange={(event) =>
                        updateField("vehicleMakeModel", event.target.value)
                      }
                      placeholder="e.g. Tata Ace Gold"
                    />
                  </div>

                  <div>
                    <label
                      className={labelClass}
                      htmlFor="vehicleRegistration"
                    >
                      Vehicle registration number *
                    </label>
                    <input
                      className={inputClass}
                      id="vehicleRegistration"
                      required
                      minLength={4}
                      maxLength={30}
                      value={form.vehicleRegistration}
                      onChange={(event) =>
                        updateField(
                          "vehicleRegistration",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="e.g. MH12AB1234"
                      autoCapitalize="characters"
                    />
                  </div>
                </div>

                {selectedVehicle?.imageUrl && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <img
                      src={selectedVehicle.imageUrl}
                      alt={selectedVehicle.name}
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-sm font-extrabold">
                        {selectedVehicle.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Fleet category ·{" "}
                        {selectedVehicle.capacityKg.toLocaleString("en-IN")} kg
                      </p>
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset
                disabled={!canEdit || saving}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-7"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black">
                      Identity and vehicle documents
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload all required document images. Initial onboarding is reviewed by an administrator; updates to existing approved profiles save directly.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <DocumentImageUploader
                    title="Identity document image"
                    description="Upload a clear image of an accepted identity document."
                    kind="identity-document"
                    assetId={form.identityDocumentAssetId}
                    legacyUrl={form.identityDocumentUrl}
                    disabled={!canEdit || saving}
                    onUploaded={(assetId) => {
                      updateField("identityDocumentAssetId", assetId);
                      updateField("identityDocumentUrl", "");
                    }}
                  />

                  <DocumentImageUploader
                    title="Vehicle registration document image"
                    description="Upload a clear image of your vehicle registration certificate."
                    kind="vehicle-document"
                    assetId={form.vehicleDocumentAssetId}
                    legacyUrl={form.vehicleDocumentUrl}
                    disabled={!canEdit || saving}
                    onUploaded={(assetId) => {
                      updateField("vehicleDocumentAssetId", assetId);
                      updateField("vehicleDocumentUrl", "");
                    }}
                  />
                </div>
              </fieldset>

              <fieldset
                disabled={!canEdit || saving}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-7"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black">Vehicle photos</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Upload four clear photos. LogiGo stores these through the
                      existing authenticated media endpoint.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {photoViews.map(({ view, title, description }) => (
                    <VehiclePhotoUploader
                      key={view}
                      view={view}
                      title={title}
                      description={description}
                      url={form.photos[view]}
                      disabled={!canEdit || saving}
                      onUploaded={updatePhoto}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/driver"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>

                <button
                  type="submit"
                  disabled={!canEdit || saving || vehicles.length === 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving
                    ? "Saving profile…"
                    : profile
                      ? "Save profile and vehicle"
                      : "Submit for initial verification"}
                </button>
              </div>

              {!canEdit && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  This profile is suspended and cannot be edited. Contact an
                  administrator.
                </p>
              )}
            </form>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl bg-[#101c30] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <h2 className="mt-4 text-lg font-black">
              How verification works
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <p className="flex gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-orange-300" />
                Submit your personal licence and vehicle information.
              </p>
              <p className="flex gap-3">
                <FileCheck2 className="mt-1 h-4 w-4 shrink-0 text-orange-300" />
                Upload all required document images and four vehicle photos.
              </p>
              <p className="flex gap-3">
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-orange-300" />
                Jobs stay unavailable until your profile is approved and active.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="text-sm font-extrabold text-blue-950">
                  Protect your documents
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-blue-900/80">
                  Document images are uploaded through LogiGo's media endpoint.
                  Only upload documents that belong to you and ensure the text
                  and photograph are clear. Vehicle photos must show the actual
                  vehicle from the requested angle.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default DriverProfile;
