import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router";

import { isAxiosError } from "axios";

import {

  ArrowLeft,

  CheckCircle2,

  Clock3,

  ExternalLink,

  FileCheck2,

  FileWarning,

  RefreshCw,

  ShieldCheck,

  Truck,

  UserRound,

  XCircle,

} from "lucide-react";

import api from "../../services/api";

type ApprovalStatus =

  | "pending"

  | "approved"

  | "rejected"

  | "suspended";

type StatusFilter = "all" | ApprovalStatus;

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

}

const formatStatus = (status: string) =>

  status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>

    letter.toUpperCase()

  );

const formatDate = (value?: string | null) => {

  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {

    dateStyle: "medium",

  }).format(date);

};

function statusClasses(status: ApprovalStatus) {

  switch (status) {

    case "approved":

      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":

    case "suspended":

      return "border-red-200 bg-red-50 text-red-700";

    default:

      return "border-amber-200 bg-amber-50 text-amber-800";

  }

}

function getErrorMessage(error: unknown, fallback: string) {

  if (isAxiosError(error)) {

    return (

      error.response?.data?.message ||

      (error.code === "ERR_NETWORK"

        ? "Cannot connect to LogiGo API. Check that the backend is running."

        : fallback)

    );

  }

  return error instanceof Error ? error.message : fallback;

}

function DocumentLink({

  label,

  url,

}: {

  label: string;

  url?: string | null;

}) {

  if (!url) {

    return (

      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">

        <FileWarning className="h-4 w-4 shrink-0 text-amber-600" />

        <div>

          <p className="text-xs font-semibold text-slate-800">{label}</p>

          <p className="mt-1 text-xs text-amber-800">

            Document link missing

          </p>

        </div>

      </div>

    );

  }

  return (

    <a

      href={url}

      target="_blank"

      rel="noopener noreferrer"

      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 transition hover:bg-emerald-100"

    >

      <span className="flex min-w-0 items-center gap-2">

        <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />

        <span className="truncate text-xs font-semibold text-slate-800">

          {label}

        </span>

      </span>

      <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />

    </a>

  );

}

function AdminDrivers() {

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);

  const [filter, setFilter] = useState<StatusFilter>("pending");

  const [rejectReasons, setRejectReasons] =

    useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  const [busyDriverId, setBusyDriverId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const loadDrivers = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const params: Record<string, string | number> = {

        page: 1,

        limit: 50,

      };

      if (filter !== "all") {

        params.approvalStatus = filter;

      }

      const response = await api.get("/drivers/admin/profiles", {

        params,

      });

      if (!response.data.success) {

        throw new Error(

          response.data.message || "Could not load driver applications."

        );

      }

      setDrivers(response.data.drivers ?? []);

    } catch (requestError: unknown) {

      setError(

        getErrorMessage(

          requestError,

          "Could not load driver applications."

        )

      );

    } finally {

      setLoading(false);

    }

  }, [filter]);

  useEffect(() => {

    void loadDrivers();

  }, [loadDrivers]);

  const reviewDriver = async (

    driver: DriverProfile,

    decision: "approve" | "reject"

  ) => {

    setError("");

    setNotice("");

    const reason = (rejectReasons[driver._id] || "").trim();

    if (decision === "reject" && reason.length < 3) {

      setError(

        `Enter a rejection reason for ${driver.user?.name || "this driver"} (at least 3 characters).`

      );

      return;

    }

    const documents = driver.documents || {};

    const hasAllDocuments = [

      documents.licenseDocumentUrl,

      documents.identityDocumentUrl,

      documents.vehicleDocumentUrl,

    ].every(Boolean);

    const expiry = new Date(driver.licenseExpiry);

    const licenseIsValid =

      !Number.isNaN(expiry.getTime()) && expiry > new Date();

    if (decision === "approve" && !hasAllDocuments) {

      setError(

        "Cannot approve this application because one or more required document links are missing."

      );

      return;

    }

    if (decision === "approve" && !licenseIsValid) {

      setError(

        "Cannot approve this application because the license is expired or its expiry date is invalid."

      );

      return;

    }

    const confirmed = window.confirm(

      decision === "approve"

        ? `Approve ${driver.user?.name || "this driver"}?`

        : `Reject ${driver.user?.name || "this driver"}'s application?`

    );

    if (!confirmed) return;

    setBusyDriverId(driver._id);

    try {

      const response = await api.patch(

        `/drivers/admin/profiles/${driver._id}/review`,

        {

          decision,

          rejectionReason: decision === "reject" ? reason : "",

        }

      );

      setNotice(

        response.data.message ||

          (decision === "approve"

            ? "Driver approved successfully."

            : "Driver application rejected.")

      );

      await loadDrivers();

    } catch (requestError: unknown) {

      setError(

        getErrorMessage(

          requestError,

          "Could not update the driver application."

        )

      );

    } finally {

      setBusyDriverId(null);

    }

  };

  const pendingCount = drivers.filter(

    (driver) => driver.approvalStatus === "pending"

  ).length;

  return (

    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">

          <Link to="/admin" className="flex items-center gap-3">

            <div className="rounded-xl bg-orange-500 p-2.5">

              <ShieldCheck className="h-5 w-5" />

            </div>

            <div>

              <p className="text-lg font-black">LogiGo</p>

              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">

                Admin workspace

              </p>

            </div>

          </Link>

          <Link

            to="/admin"

            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"

          >

            <ArrowLeft className="h-4 w-4" />

            Dashboard

          </Link>

        </div>

      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">

              Driver management

            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">

              Driver approvals

            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">

              Review driver details and submitted documents before

              granting access to delivery jobs.

            </p>

          </div>

          <button

            type="button"

            disabled={loading}

            onClick={() => void loadDrivers()}

            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/5 disabled:opacity-50"

          >

            <RefreshCw

              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}

            />

            Refresh applications

          </button>

        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

            <div className="flex items-center gap-3">

              <Clock3 className="h-5 w-5 text-amber-600" />

              <p className="text-sm text-slate-500">

                Applications in this view

              </p>

            </div>

            <p className="mt-3 text-3xl font-black">

              {loading ? "—" : drivers.length}

            </p>

          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

            <div className="flex items-center gap-3">

              <UserRound className="h-5 w-5 text-blue-700" />

              <p className="text-sm text-slate-500">

                Pending in this view

              </p>

            </div>

            <p className="mt-3 text-3xl font-black text-amber-800">

              {loading ? "—" : pendingCount}

            </p>

          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

            <div className="flex items-center gap-3">

              <Truck className="h-5 w-5 text-emerald-700" />

              <p className="text-sm text-slate-500">

                Approval requirement

              </p>

            </div>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">

              Valid license and all required document links

            </p>

          </div>

        </div>

        <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white shadow-sm p-4 sm:p-5">

          <label

            htmlFor="approvalFilter"

            className="mb-2 block text-sm font-semibold text-slate-700"

          >

            Filter driver applications

          </label>

          <select

            id="approvalFilter"

            value={filter}

            onChange={(event) =>

              setFilter(event.target.value as StatusFilter)

            }

            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:max-w-xs"

          >

            <option value="pending">Pending applications</option>

            <option value="approved">Approved drivers</option>

            <option value="rejected">Rejected applications</option>

            <option value="suspended">Suspended drivers</option>

            <option value="all">All applications</option>

          </select>

        </section>

        {error && (

          <div

            role="alert"

            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"

          >

            {error}

          </div>

        )}

        {notice && (

          <div

            role="status"

            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700"

          >

            {notice}

          </div>

        )}

        {loading && (

          <div className="mt-8 rounded-2xl border border-slate-200 p-8 text-center">

            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-orange-600" />

            <p className="mt-4 text-sm text-slate-500">

              Loading driver applications...

            </p>

          </div>

        )}

        {!loading && !error && drivers.length === 0 && (

          <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] px-6 py-14 text-center">

            <UserRound className="mx-auto h-10 w-10 text-slate-500" />

            <h2 className="mt-4 text-xl font-bold">

              No applications found

            </h2>

            <p className="mt-2 text-sm text-slate-500">

              There are no driver profiles matching this filter.

            </p>

          </div>

        )}

        {!loading && drivers.length > 0 && (

          <div className="mt-8 grid gap-6">

            {drivers.map((driver) => {

              const documents = driver.documents || {};

              const hasAllDocuments = [

                documents.licenseDocumentUrl,

                documents.identityDocumentUrl,

                documents.vehicleDocumentUrl,

              ].every(Boolean);

              const expiry = new Date(driver.licenseExpiry);

              const licenseIsValid =

                !Number.isNaN(expiry.getTime()) &&

                expiry > new Date();

              const canApprove =

                driver.approvalStatus === "pending" &&

                hasAllDocuments &&

                licenseIsValid;

              const isBusy = busyDriverId === driver._id;

              return (

                <article

                  key={driver._id}

                  className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-5 sm:p-7"

                >

                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

                    <div className="flex items-start gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50">

                        <UserRound className="h-7 w-7 text-orange-600" />

                      </div>

                      <div>

                        <h2 className="text-xl font-bold">

                          {driver.user?.name || "Unknown driver"}

                        </h2>

                        <p className="mt-1 break-all text-sm text-slate-500">

                          {driver.user?.email || "Email unavailable"}

                        </p>

                        <p className="mt-1 text-sm text-slate-500">

                          {driver.user?.phone || "Phone not provided"}

                        </p>

                        <p className="mt-3 text-xs text-slate-500">

                          Submitted {formatDate(driver.createdAt)}

                        </p>

                      </div>

                    </div>

                    <span

                      className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClasses(driver.approvalStatus)}`}

                    >

                      {formatStatus(driver.approvalStatus)}

                    </span>

                  </div>

                  <div className="my-6 border-t border-slate-200" />

                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                    <div>

                      <p className="text-xs text-slate-500">

                        License number

                      </p>

                      <p className="mt-2 break-all font-semibold">

                        {driver.licenseNumber}

                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">

                        License expiry

                      </p>

                      <p

                        className={`mt-2 font-semibold ${licenseIsValid ? "text-slate-800" : "text-red-700"}`}

                      >

                        {formatDate(driver.licenseExpiry)}

                      </p>

                      {!licenseIsValid && (

                        <p className="mt-1 text-xs text-red-700">

                          Expired or invalid date

                        </p>

                      )}

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">

                        Requested vehicle type

                      </p>

                      <p className="mt-2 font-semibold">

                        {formatStatus(driver.vehicleType)}

                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">

                        Make and model

                      </p>

                      <p className="mt-2 font-semibold">

                        {driver.vehicleMakeModel}

                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">

                        Registration number

                      </p>

                      <p className="mt-2 font-semibold">

                        {driver.vehicleRegistration}

                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">

                        Declared capacity

                      </p>

                      <p className="mt-2 font-semibold">

                        {driver.vehicleCapacityKg.toLocaleString("en-IN")} kg

                      </p>

                    </div>

                  </div>

                  <div className="mt-7">

                    <h3 className="text-sm font-bold">

                      Submitted documents

                    </h3>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">

                      <DocumentLink

                        label="Driving license"

                        url={documents.licenseDocumentUrl}

                      />

                      <DocumentLink

                        label="Identity document"

                        url={documents.identityDocumentUrl}

                      />

                      <DocumentLink

                        label="Vehicle document"

                        url={documents.vehicleDocumentUrl}

                      />

                    </div>

                    {!hasAllDocuments && (

                      <p className="mt-3 text-xs leading-5 text-amber-800">

                        Approval is disabled until all three document

                        links are supplied. Ask the driver to resubmit

                        the profile with the missing documents.

                      </p>

                    )}

                  </div>

                  {driver.approvalStatus === "rejected" &&

                    driver.rejectionReason && (

                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

                        <p className="text-xs font-semibold text-red-700">

                          Previous rejection reason

                        </p>

                        <p className="mt-2 text-sm text-slate-700">

                          {driver.rejectionReason}

                        </p>

                      </div>

                    )}

                  {driver.approvalStatus === "pending" && (

                    <div className="mt-7 border-t border-slate-200 pt-6">

                      <label

                        htmlFor={`reject-${driver._id}`}

                        className="block text-sm font-semibold text-slate-700"

                      >

                        Rejection reason

                      </label>

                      <textarea

                        id={`reject-${driver._id}`}

                        value={rejectReasons[driver._id] || ""}

                        onChange={(event) =>

                          setRejectReasons((current) => ({

                            ...current,

                            [driver._id]: event.target.value,

                          }))

                        }

                        rows={2}

                        maxLength={500}

                        placeholder="Required only if rejecting this application"

                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"

                      />

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">

                        <button

                          type="button"

                          disabled={isBusy || !canApprove}

                          onClick={() =>

                            void reviewDriver(driver, "approve")

                          }

                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"

                        >

                          {isBusy ? (

                            <RefreshCw className="h-4 w-4 animate-spin" />

                          ) : (

                            <CheckCircle2 className="h-4 w-4" />

                          )}

                          Approve driver

                        </button>

                        <button

                          type="button"

                          disabled={

                            isBusy ||

                            (rejectReasons[driver._id] || "").trim().length < 3

                          }

                          onClick={() =>

                            void reviewDriver(driver, "reject")

                          }

                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"

                        >

                          <XCircle className="h-4 w-4" />

                          Reject application

                        </button>

                      </div>

                    </div>

                  )}

                </article>

              );

            })}

          </div>

        )}

      </main>

    </div>

  );

}

export default AdminDrivers;
