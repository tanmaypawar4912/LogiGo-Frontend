import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  ExternalLink,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import { getDriverError } from "../../hooks/useDriverJobs";

interface Photos {
  front?: string;
  right?: string;
  left?: string;
  back?: string;
}

interface MediaAccessState {
  status: "loading" | "ready" | "failed";
  url?: string;
}

interface DriverDocumentsData {
  licenseDocumentUrl?: string | null;
  identityDocumentUrl?: string | null;
  vehicleDocumentUrl?: string | null;
  licenseDocumentAssetId?: string | null;
  identityDocumentAssetId?: string | null;
  vehicleDocumentAssetId?: string | null;
}

interface VehicleItem {
  _id: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleType: string;
  approvalStatus: string;
  isPrimary: boolean;
  vehicleDocumentUrl?: string | null;
  vehicleDocumentAssetId?: string | null;
  photos?: Photos;
}

interface Profile {
  _id: string;
  approvalStatus: string;
  licenseNumber: string;
  licenseExpiry: string;
  documents?: DriverDocumentsData;
  vehiclePhotos?: Photos;
  registeredVehicles?: VehicleItem[];
}

const panel = "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6";

function secureHref(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function DocumentRow({
  label,
  description,
  url,
  assetId,
  mediaAccess,
}: {
  label: string;
  description: string;
  url?: string | null;
  assetId?: string | null;
  mediaAccess: Record<string, MediaAccessState>;
}) {
  // Private document asset IDs must be resolved through the authenticated API.
  // Do not treat an empty legacy URL as missing when an asset ID exists.
  const access = assetId ? mediaAccess[assetId] : undefined;
  const href = secureHref(assetId ? access?.url : url);
  const loading = Boolean(assetId && access?.status === "loading");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${href ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
          {href ? <FileCheck2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          <p className={`mt-1.5 text-xs font-extrabold ${href ? "text-emerald-700" : access?.status === "failed" ? "text-rose-700" : "text-amber-700"}`}>
            {href
              ? "Secure document link available"
              : loading
                ? "Loading secure document access…"
                : access?.status === "failed"
                  ? "Secure document access unavailable — refresh to retry"
                  : assetId
                    ? "Uploaded document asset needs access verification"
                    : "Document link missing or invalid"}
          </p>
        </div>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          Open document <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : loading ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
      ) : null}
    </div>
  );
}

function PhotoGrid({ photos }: { photos?: Photos }) {
  const list: { key: keyof Photos; label: string }[] = [
    { key: "front", label: "Front view" },
    { key: "right", label: "Right side" },
    { key: "left", label: "Left side" },
    { key: "back", label: "Back view" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {list.map(({ key, label }) => {
        const href = secureHref(photos?.[key]);
        return (
          <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex h-28 items-center justify-center sm:h-36">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="h-full w-full">
                  <img src={href} alt={label} loading="lazy" className="h-full w-full object-contain" />
                </a>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon className="mx-auto h-6 w-6" />
                  <p className="mt-1 text-[10px] font-bold">Photo missing</p>
                </div>
              )}
            </div>
            <p className="border-t border-slate-200 bg-white px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function DriverDocuments() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [mediaAccess, setMediaAccess] = useState<Record<string, MediaAccessState>>({});
  const [loading, setLoading] = useState(true);
  const [missingProfile, setMissingProfile] = useState(false);
  const [error, setError] = useState("");

  const mediaAccessRef = useRef<Record<string, MediaAccessState>>({});
  const mediaInFlight = useRef(new Set<string>());

  const updateMediaAccess = useCallback((assetId: string, value: MediaAccessState) => {
    mediaAccessRef.current = { ...mediaAccessRef.current, [assetId]: value };
    setMediaAccess((current) => ({ ...current, [assetId]: value }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileRes, vehicleRes] = await Promise.all([
        api.get("/drivers/profile"),
        api.get("/drivers/vehicles"),
      ]);

      if (!profileRes.data?.success || !vehicleRes.data?.success) {
        throw new Error("Could not load all driver documents.");
      }

      setProfile(profileRes.data.profile as Profile);
      setVehicles(Array.isArray(vehicleRes.data.vehicles) ? vehicleRes.data.vehicles : []);
      setMissingProfile(false);
    } catch (requestError: unknown) {
      if (isAxiosError(requestError) && requestError.response?.status === 404) {
        setProfile(null);
        setVehicles([]);
        setMissingProfile(true);
      } else {
        setError(getDriverError(requestError, "Unable to load driver documents."));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const assetIds = new Set<string>();
    const collect = (id?: string | null) => {
      if (id && /^[a-f\d]{24}$/i.test(id)) assetIds.add(id);
    };

    collect(profile?.documents?.licenseDocumentAssetId);
    collect(profile?.documents?.identityDocumentAssetId);
    collect(profile?.documents?.vehicleDocumentAssetId);

    for (const vehicle of vehicles) {
      collect(vehicle.vehicleDocumentAssetId);
    }

    for (const assetId of assetIds) {
      const cached = mediaAccessRef.current[assetId];
      if (cached?.status === "ready" && secureHref(cached.url)) continue;
      if (mediaInFlight.current.has(assetId)) continue;

      mediaInFlight.current.add(assetId);
      updateMediaAccess(assetId, { status: "loading" });

      void api
        .get(`/drivers/media/${assetId}/access`)
        .then((response) => {
          const href = response.data?.success ? secureHref(response.data?.url) : null;
          updateMediaAccess(
            assetId,
            href ? { status: "ready", url: href } : { status: "failed" }
          );
        })
        .catch(() => {
          updateMediaAccess(assetId, { status: "failed" });
        })
        .finally(() => {
          mediaInFlight.current.delete(assetId);
        });
    }
  }, [profile, vehicles, updateMediaAccess]);

  const primaryVehicle =
    vehicles.find((vehicle) => vehicle.isPrimary) ||
    vehicles[0] ||
    profile?.registeredVehicles?.find((vehicle) => vehicle.isPrimary) ||
    profile?.registeredVehicles?.[0];

  // Per-view fallback matters because Mongoose photo schemas may exist with
  // empty strings even when older profile-level photos were successfully saved.
  const currentPhotos: Photos = {
    front: primaryVehicle?.photos?.front || profile?.vehiclePhotos?.front || "",
    right: primaryVehicle?.photos?.right || profile?.vehiclePhotos?.right || "",
    left: primaryVehicle?.photos?.left || profile?.vehiclePhotos?.left || "",
    back: primaryVehicle?.photos?.back || profile?.vehiclePhotos?.back || "",
  };

  const displayedVehicles = primaryVehicle ? [primaryVehicle] : [];

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">
              Verification centre
            </p>
            <h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.65rem)] font-black tracking-tight">
              Documents
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              View your saved identity documents, vehicle registration and all four vehicle photos.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              mediaAccessRef.current = {};
              mediaInFlight.current.clear();
              setMediaAccess({});
              void load();
            }}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className={`${panel} py-14 text-center`}>
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" />
            <p className="mt-3 text-sm text-slate-500">Loading documents…</p>
          </div>
        ) : missingProfile || !profile ? (
          <section className={`${panel} py-12 text-center`}>
            <ShieldCheck className="mx-auto h-10 w-10 text-orange-500" />
            <h2 className="mt-4 text-xl font-black">Finish driver onboarding first</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Licence, identity and vehicle documents will appear here after your initial driver profile is submitted.
            </p>
            <Link to="/driver/profile" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-orange-600">
              Complete profile <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            <section className={panel}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black">Personal verification documents</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Private document uploads are opened through temporary authenticated access links.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <DocumentRow
                  label="Driving licence"
                  description={`Licence number ${profile.licenseNumber} · expires ${new Date(profile.licenseExpiry).toLocaleDateString("en-IN")}`}
                  url={profile.documents?.licenseDocumentUrl}
                  assetId={profile.documents?.licenseDocumentAssetId}
                  mediaAccess={mediaAccess}
                />
                <DocumentRow
                  label="Identity document"
                  description="Identity information provided for administrator verification."
                  url={profile.documents?.identityDocumentUrl}
                  assetId={profile.documents?.identityDocumentAssetId}
                  mediaAccess={mediaAccess}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 text-sm leading-6 text-blue-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>You can replace documents and vehicle photos from your profile. Initial driver onboarding must be approved before you can go online.</span>
                </div>
                <Link to="/driver/profile" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold text-blue-900 hover:bg-blue-100">
                  Edit documents <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            {displayedVehicles.map((vehicle) => (
              <section key={vehicle._id} className={panel}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Truck className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black">{vehicle.vehicleMakeModel}</h2>
                        <span className="rounded-full bg-[#101c30] px-2 py-1 text-[10px] font-extrabold text-white">Registered vehicle</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold capitalize text-slate-700">{vehicle.approvalStatus}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{vehicle.vehicleType} · {vehicle.vehicleRegistration}</p>
                    </div>
                  </div>
                  <Link to="/driver/vehicles" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                    Manage vehicle <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-4">
                  <DocumentRow
                    label="Vehicle registration document"
                    description="Proof of ownership or registration for this vehicle."
                    url={vehicle.vehicleDocumentUrl || profile.documents?.vehicleDocumentUrl}
                    assetId={vehicle.vehicleDocumentAssetId || profile.documents?.vehicleDocumentAssetId}
                    mediaAccess={mediaAccess}
                  />
                </div>

                <div className="mt-5">
                  <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Four vehicle photos</p>
                  <PhotoGrid photos={currentPhotos} />
                </div>

                {!Object.values(currentPhotos).every((value) => Boolean(secureHref(value))) && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    One or more vehicle photos are missing from the saved vehicle record. Upload all four views from your profile page and save your vehicle details. If you are a new driver, initial administrator approval is still required before dispatch.
                    <Link to="/driver/profile" className="ml-1 inline-flex items-center gap-1 font-extrabold underline">
                      Open profile <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {vehicle.approvalStatus !== "approved" && (
                  <p className="mt-3 text-xs leading-5 text-amber-800">
                    This vehicle's documents/photos are awaiting approval or need review. Check Vehicle Details for the current status.
                  </p>
                )}
              </section>
            ))}

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-blue-950">Keep document access secure</h2>
                  <p className="mt-1 text-xs leading-5 text-blue-900/80">
                    Do not expose public links to licences or identity cards. Vehicle photos must be saved on your registered vehicle and verified before automatic dispatch eligibility is enabled.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
