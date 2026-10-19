
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileWarning,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

import api from "../../services/api";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
type Decision = "approve" | "reject";

interface PhotoSet {
  front?: string;
  right?: string;
  left?: string;
  back?: string;
}

interface DriverUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface DriverDocuments {
  licenseDocumentUrl?: string | null;
  identityDocumentUrl?: string | null;
  vehicleDocumentUrl?: string | null;
  licenseDocumentAssetId?: string | null;
  identityDocumentAssetId?: string | null;
  vehicleDocumentAssetId?: string | null;
}

interface DriverProfile {
  _id: string;
  user: DriverUser | null;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleType: string;
  vehicleMakeModel: string;
  vehicleRegistration: string;
  vehicleCapacityKg: number;
  approvalStatus: ApprovalStatus;
  availability: "offline" | "online" | "busy";
  isActive: boolean;
  approvedAt?: string | null;
  createdAt: string;
  rejectionReason: string;
  documents?: DriverDocuments;
  vehiclePhotos?: PhotoSet;
}

interface MediaAccessState {
  status: "loading" | "ready" | "failed";
  url?: string;
}

const inputClass =
  "min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-50";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string;
          errors?: { field?: string; message?: string }[];
        }
      | undefined;

    if (Array.isArray(data?.errors) && data.errors.length) {
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
        ? "Cannot connect to LogiGo API. Check that the backend is running."
        : fallback)
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function secureUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" || url.username || url.password) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "approved" || value === "online"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : value === "rejected" || value === "suspended"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : value === "busy"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold capitalize ${tone}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function DocumentLink({
  label,
  url,
  assetId,
  mediaAccess,
}: {
  label: string;
  url?: string | null;
  assetId?: string | null;
  mediaAccess: Record<string, MediaAccessState>;
}) {
  const assetState = assetId ? mediaAccess[assetId] : undefined;

  const href = secureUrl(
    assetId ? assetState?.url : url
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs font-extrabold text-slate-800">{label}</p>

        <p
          className={`mt-1 text-[10px] font-bold ${
            href
              ? "text-emerald-700"
              : assetState?.status === "failed"
                ? "text-rose-700"
                : "text-amber-700"
          }`}
        >
          {href
            ? "Secure document link ready"
            : assetState?.status === "loading"
              ? "Obtaining secure access..."
              : assetState?.status === "failed"
                ? "Document access unavailable"
                : "Missing or invalid document link"}
        </p>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-orange-700 hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      ) : assetState?.status === "loading" ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
      ) : (
        <FileWarning className="h-4 w-4 shrink-0 text-amber-600" />
      )}
    </div>
  );
}

function VehiclePhotos({ photos }: { photos?: PhotoSet }) {
  const views = [
    { key: "front", label: "Front" },
    { key: "right", label: "Right" },
    { key: "left", label: "Left" },
    { key: "back", label: "Back" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {views.map(({ key, label }) => {
        const src = secureUrl(photos?.[key]);

        return (
          <div
            key={key}
            className="overflow-hidden rounded-lg border border-slate-200"
          >
            <div className="flex h-24 items-center justify-center bg-slate-50">
              {src ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-full w-full items-center justify-center"
                  aria-label={`Open ${label.toLowerCase()} vehicle photo`}
                >
                  <img
                    src={src}
                    alt={`${label} vehicle view`}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </a>
              ) : (
                <ImageIcon className="h-5 w-5 text-slate-300" />
              )}
            </div>

            <p className="border-t border-slate-200 px-2 py-1 text-center text-[10px] font-bold text-slate-500">
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDriverApprovals() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [filter, setFilter] = useState<"all" | ApprovalStatus>("pending");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {}
  );
  const [mediaAccess, setMediaAccess] = useState<
    Record<string, MediaAccessState>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Refs prevent React state changes from starting duplicate access requests.
  const mediaAccessRef = useRef<Record<string, MediaAccessState>>({});
  const mediaRequestsInFlight = useRef(new Set<string>());

  const updateMediaAccess = useCallback(
    (assetId: string, value: MediaAccessState) => {
      mediaAccessRef.current = {
        ...mediaAccessRef.current,
        [assetId]: value,
      };

      setMediaAccess((current) => ({
        ...current,
        [assetId]: value,
      }));
    },
    []
  );

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/drivers/admin/profiles", {
        params: { page: 1, limit: 50 },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Could not load driver profiles."
        );
      }

      setDrivers(
        Array.isArray(response.data.drivers) ? response.data.drivers : []
      );
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Could not load driver profiles.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  /*
   * Critical fix:
   *
   * This effect depends on the driver list, NOT mediaAccess.
   * Updating the media-access state therefore does not restart this effect.
   * Refs also ensure that each asset has at most one request in flight.
   */
  useEffect(() => {
    const assetIds = new Set<string>();

    function collect(assetId?: string | null) {
      if (assetId && /^[a-f\d]{24}$/i.test(assetId)) {
        assetIds.add(assetId);
      }
    }

    for (const driver of drivers) {
      collect(driver.documents?.licenseDocumentAssetId);
      collect(driver.documents?.identityDocumentAssetId);
      collect(driver.documents?.vehicleDocumentAssetId);

    }

    for (const assetId of assetIds) {
      const cached = mediaAccessRef.current[assetId];

      if (cached?.status === "ready" && secureUrl(cached.url)) {
        continue;
      }

      if (mediaRequestsInFlight.current.has(assetId)) {
        continue;
      }

      mediaRequestsInFlight.current.add(assetId);
      updateMediaAccess(assetId, { status: "loading" });

      void api
        .get(`/drivers/media/${assetId}/access`)
        .then((response) => {
          const url = response.data?.success
            ? secureUrl(response.data?.url)
            : null;

          updateMediaAccess(
            assetId,
            url
              ? { status: "ready", url }
              : { status: "failed" }
          );
        })
        .catch(() => {
          updateMediaAccess(assetId, { status: "failed" });
        })
        .finally(() => {
          mediaRequestsInFlight.current.delete(assetId);
        });
    }
  }, [drivers, updateMediaAccess]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? drivers
        : drivers.filter((driver) => driver.approvalStatus === filter),
    [drivers, filter]
  );

  function documentExists(
    assetId?: string | null,
    url?: string | null
  ) {
    return Boolean(
      (assetId && /^[a-f\d]{24}$/i.test(assetId)) || secureUrl(url)
    );
  }

  async function reviewProfile(
    driver: DriverProfile,
    decision: Decision
  ) {
    const reason = (rejectReasons[driver._id] || "").trim();

    if (decision === "reject" && reason.length < 3) {
      setError(
        `Enter a rejection reason for ${driver.user?.name || "this driver"} (at least 3 characters).`
      );
      return;
    }

    if (decision === "approve") {
      const expiry = new Date(driver.licenseExpiry);

      if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
        setError("This licence is expired or invalid.");
        return;
      }

      const docs = driver.documents;

      if (
        !documentExists(
          docs?.licenseDocumentAssetId,
          docs?.licenseDocumentUrl
        ) ||
        !documentExists(
          docs?.identityDocumentAssetId,
          docs?.identityDocumentUrl
        ) ||
        !documentExists(
          docs?.vehicleDocumentAssetId,
          docs?.vehicleDocumentUrl
        )
      ) {
        setError(
          "Cannot approve this application because required document assets or HTTPS links are missing."
        );
        return;
      }

      const photos = driver.vehiclePhotos;

      if (
        ![
          photos?.front,
          photos?.right,
          photos?.left,
          photos?.back,
        ].every((url) => Boolean(secureUrl(url)))
      ) {
        setError(
          "All four valid HTTPS vehicle photo views are required before approval."
        );
        return;
      }
    }

    if (
      !window.confirm(
        `${decision === "approve" ? "Approve" : "Reject"} ${driver.user?.name || "this driver"}?`
      )
    ) {
      return;
    }

    setBusyId(driver._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/drivers/admin/profiles/${driver._id}/review`,
        {
          decision,
          rejectionReason: decision === "reject" ? reason : "",
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Could not review driver."
        );
      }

      setNotice(
        response.data.message ||
          (decision === "approve"
            ? "Driver approved successfully."
            : "Driver application rejected.")
      );

      await loadDrivers();
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Could not update driver approval.")
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-700 sm:text-xs">
              Operations · driver access
            </p>
            <h1 className="mt-2 text-[clamp(1.9rem,3.2vw,2.65rem)] font-black tracking-tight">
              Driver approvals
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review new driver onboarding applications, licence documents and the
              four required vehicle photos. Existing approved drivers update their details directly.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadDrivers()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh queue
          </button>
        </header>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-5 rounded-2xl border p-4 text-sm leading-6 ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Profiles loaded", value: drivers.length },
            {
              label: "Awaiting initial approval",
              value: drivers.filter((driver) => driver.approvalStatus === "pending").length,
            },
            {
              label: "Approved drivers",
              value: drivers.filter((driver) => driver.approvalStatus === "approved").length,
            },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-black tabular-nums">{loading ? "—" : card.value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label
            htmlFor="approval-filter"
            className="block text-xs font-extrabold text-slate-700"
          >
            Filter initial onboarding profiles
          </label>
          <select
            id="approval-filter"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | ApprovalStatus)
            }
            className={`${inputClass} mt-2 sm:max-w-xs`}
          >
            <option value="pending">Pending profiles</option>
            <option value="approved">Approved drivers</option>
            <option value="rejected">Rejected profiles</option>
            <option value="suspended">Suspended profiles</option>
            <option value="all">All profiles</option>
          </select>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-orange-500" />
            <p className="mt-3 text-sm text-slate-500">
              Loading driver review queue…
            </p>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-black">
                  Initial driver applications ({visible.length})
                </h2>
              </div>

              {visible.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No profiles match this filter.
                </div>
              ) : (
                visible.map((driver) => {
                  const docs = driver.documents || {};

                  const hasDocuments =
                    documentExists(
                      docs.licenseDocumentAssetId,
                      docs.licenseDocumentUrl
                    ) &&
                    documentExists(
                      docs.identityDocumentAssetId,
                      docs.identityDocumentUrl
                    ) &&
                    documentExists(
                      docs.vehicleDocumentAssetId,
                      docs.vehicleDocumentUrl
                    );

                  const photos = driver.vehiclePhotos;

                  const hasPhotos = [
                    photos?.front,
                    photos?.right,
                    photos?.left,
                    photos?.back,
                  ].every((url) => Boolean(secureUrl(url)));

                  return (
                    <article
                      key={driver._id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-4 bg-[#101c30] p-4 text-white sm:flex-row sm:items-start sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500">
                            <UserRound className="h-5 w-5" />
                          </span>

                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-black">
                              {driver.user?.name || "Unknown driver"}
                            </h3>
                            <p className="mt-1 break-all text-xs text-slate-300">
                              {driver.user?.email || "No email"} ·{" "}
                              {driver.user?.phone || "No phone"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Submitted {formatDate(driver.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill value={driver.approvalStatus} />
                          <StatusPill value={driver.availability} />
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            ["Licence number", driver.licenseNumber],
                            ["Licence expiry", formatDate(driver.licenseExpiry)],
                            ["Vehicle category", driver.vehicleType],
                            ["Make / model", driver.vehicleMakeModel],
                            ["Registration", driver.vehicleRegistration],
                            [
                              "Declared capacity",
                              `${Number(driver.vehicleCapacityKg || 0).toLocaleString("en-IN")} kg`,
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                {label}
                              </p>
                              <p className="mt-1 break-words text-sm font-extrabold">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5">
                          <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Submitted documents
                          </h4>

                          <div className="grid gap-2 sm:grid-cols-3">
                            <DocumentLink
                              label="Driving licence"
                              url={docs.licenseDocumentUrl}
                              assetId={docs.licenseDocumentAssetId}
                              mediaAccess={mediaAccess}
                            />
                            <DocumentLink
                              label="Identity document"
                              url={docs.identityDocumentUrl}
                              assetId={docs.identityDocumentAssetId}
                              mediaAccess={mediaAccess}
                            />
                            <DocumentLink
                              label="Vehicle registration"
                              url={docs.vehicleDocumentUrl}
                              assetId={docs.vehicleDocumentAssetId}
                              mediaAccess={mediaAccess}
                            />
                          </div>
                        </div>

                        <div className="mt-5">
                          <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            <Truck className="h-4 w-4" />
                            Four-angle vehicle inspection photos
                          </h4>
                          <VehiclePhotos photos={driver.vehiclePhotos} />
                        </div>

                        {driver.rejectionReason && (
                          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                            <strong>Previous admin note:</strong>{" "}
                            {driver.rejectionReason}
                          </p>
                        )}

                        {driver.approvalStatus === "pending" && (
                          <div className="mt-5 border-t border-slate-100 pt-4">
                            <label className="block text-xs font-extrabold text-slate-700">
                              Rejection reason (required when rejecting)
                              <input
                                className={`${inputClass} mt-1.5`}
                                value={rejectReasons[driver._id] || ""}
                                onChange={(event) =>
                                  setRejectReasons((current) => ({
                                    ...current,
                                    [driver._id]: event.target.value,
                                  }))
                                }
                                maxLength={500}
                                placeholder="Explain what must be corrected"
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busyId === driver._id}
                                onClick={() =>
                                  void reviewProfile(driver, "approve")
                                }
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve profile
                              </button>

                              <button
                                type="button"
                                disabled={busyId === driver._id}
                                onClick={() =>
                                  void reviewProfile(driver, "reject")
                                }
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-extrabold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject profile
                              </button>
                            </div>

                            {!hasDocuments && (
                              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-800">
                                <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
                                One or more required documents are missing.
                                Approval remains blocked until the required
                                document assets or HTTPS links are present.
                              </p>
                            )}

                            {!hasPhotos && (
                              <p className="mt-2 text-xs leading-5 text-amber-800">
                                All four valid HTTPS vehicle photos are required.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>

          </>
        )}
      </div>
    </main>
  );
}
