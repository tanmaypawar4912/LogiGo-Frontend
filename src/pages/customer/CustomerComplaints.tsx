import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  RefreshCw,
  Send,
} from "lucide-react";

import api from "../../services/api";

type Booking = {
  _id: string;
  bookingCode: string;
  status: string;
  createdAt?: string;
};

type PopulatedBooking = { _id: string; bookingCode?: string; status?: string };
type Complaint = {
  _id: string;
  complaintCode: string;
  subject: string;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed" | "dismissed" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  createdAt: string;
  booking?: PopulatedBooking | string | null;
  adminNotes?: string;
  resolution?: string;
};

const categories = [
  { value: "booking", label: "Booking" },
  { value: "driver", label: "Driver" },
  { value: "vehicle", label: "Vehicle" },
  { value: "payment", label: "Payment" },
  { value: "delivery", label: "Delivery" },
  { value: "app", label: "App / Website" },
  { value: "other", label: "Other" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo. Check that the backend is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusClass(status: string) {
  if (status === "resolved" || status === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "dismissed") return "border-slate-200 bg-slate-100 text-slate-600";
  if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function priorityClass(priority: string) {
  if (priority === "urgent" || priority === "high") return "text-red-700";
  if (priority === "low") return "text-slate-500";
  return "text-orange-700";
}

function bookingCodeOf(complaint: Complaint) {
  return typeof complaint.booking === "object" && complaint.booking
    ? complaint.booking.bookingCode || "Linked booking"
    : complaint.booking
      ? "Linked booking"
      : "General complaint";
}

function CustomerComplaints() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("delivery");
  const [description, setDescription] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const [bookingResponse, complaintResponse] = await Promise.all([
        api.get("/bookings/my", { params: { page: 1, limit: 100 } }),
        api.get("/complaints/mine"),
      ]);
      if (!bookingResponse.data?.success || !complaintResponse.data?.success) {
        throw new Error("Unable to load your bookings and complaints.");
      }
      setBookings(Array.isArray(bookingResponse.data.bookings) ? bookingResponse.data.bookings : []);
      setComplaints(Array.isArray(complaintResponse.data.complaints) ? complaintResponse.data.complaints : []);
    } catch (error: unknown) {
      setPageError(errorMessage(error, "Unable to load your complaint information."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    if (subject.trim().length < 3) {
      setSubmitError("Subject must contain at least 3 characters.");
      return;
    }
    if (description.trim().length < 10) {
      setSubmitError("Please describe the issue in at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/complaints", {
        ...(bookingId ? { bookingId } : {}),
        subject: subject.trim(),
        category,
        description: description.trim(),
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to submit your complaint.");
      }
      setSuccessMessage(
        response.data.message
          ? `${response.data.message}${response.data.complaint?.complaintCode ? ` Reference: ${response.data.complaint.complaintCode}` : ""}`
          : "Your complaint was submitted successfully.",
      );
      setSubject("");
      setCategory("delivery");
      setDescription("");
      setBookingId("");
      await loadData();
    } catch (error: unknown) {
      setSubmitError(errorMessage(error, "Unable to submit your complaint."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange-700 sm:text-xs"><LifeBuoy className="h-3.5 w-3.5" /> We're here to help</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Raise a complaint</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Tell our support team what happened. Link a booking if the issue relates to a specific delivery, and keep the reference number for follow-up.</p>

          <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><ClipboardList className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Complaint details</h2><p className="mt-1 text-sm leading-5 text-slate-500">Please include enough detail for us to investigate.</p></div></div>
            {pageError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}<button type="button" onClick={() => void loadData()} className="ml-2 inline-flex items-center gap-1 font-bold underline"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>}
            {successMessage && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{successMessage}</div>}
            {submitError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block text-sm font-bold text-slate-700">Related booking <span className="font-medium text-slate-400">(optional)</span><select value={bookingId} onChange={(event) => setBookingId(event.target.value)} className={inputClass}><option value="">General issue / no booking</option>{bookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.bookingCode} · {formatLabel(booking.status)}</option>)}</select></label>
              <label className="block text-sm font-bold text-slate-700">Category<select required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block text-sm font-bold text-slate-700">Subject<input required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly summarize the issue" className={inputClass} /><span className="mt-1.5 block text-right text-xs font-medium text-slate-400">{subject.length}/120</span></label>
              <label className="block text-sm font-bold text-slate-700">Description<textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Please describe what happened, including any relevant details." className={`${inputClass} resize-y`} /><span className="mt-1.5 block text-right text-xs font-medium text-slate-400">{description.length}/2000</span></label>
              <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Do not include passwords or payment card details in your complaint.</span></div>
              <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><RefreshCw className="h-4 w-4 animate-spin" />Submitting…</> : <>Submit complaint <Send className="h-4 w-4" /></>}</button>
            </form>
          </div>
        </section>

        <aside className="min-w-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">Your complaints</h2><p className="mt-1 text-sm text-slate-500">Track the status of issues reported by you.</p></div><span className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-700">{complaints.length}</span></div>
            {loading ? <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading complaints…</div> : complaints.length === 0 ? <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center"><LifeBuoy className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No complaints yet</p><p className="mt-1 text-sm text-slate-500">Submitted complaints and their status will appear here.</p></div> : <div className="mt-5 space-y-3">{complaints.map((complaint) => <article key={complaint._id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-all text-xs font-extrabold uppercase tracking-wide text-orange-700">{complaint.complaintCode}</p><h3 className="mt-1 break-words text-sm font-black text-slate-800">{complaint.subject}</h3></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusClass(complaint.status)}`}>{formatLabel(complaint.status)}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span>{formatLabel(complaint.category)}</span><span>•</span><span>{bookingCodeOf(complaint)}</span><span>•</span><span>{formatDate(complaint.createdAt)}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{complaint.description}</p><p className={`mt-3 text-xs font-extrabold ${priorityClass(complaint.priority)}`}>Priority: {formatLabel(complaint.priority)}</p>{complaint.resolution && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-extrabold text-emerald-800">Resolution</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-emerald-900">{complaint.resolution}</p></div>}{complaint.adminNotes && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-extrabold text-slate-600">Support update</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{complaint.adminNotes}</p></div>}</article>)}</div>}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600"><CheckCircle2 className="h-4 w-4" /></span><p className="text-sm leading-6 text-slate-600"><strong className="text-slate-800">You can follow progress here.</strong> Keep the complaint reference code in case you need to discuss the issue with support.</p></div>
          <Link to="/customer/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700 hover:text-orange-800">Return to my orders <ArrowRight className="h-4 w-4" /></Link>
        </aside>
      </main>
    </div>
  );
}

export default CustomerComplaints;
