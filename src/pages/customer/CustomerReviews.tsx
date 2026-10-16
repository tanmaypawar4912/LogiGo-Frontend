import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  Star,
} from "lucide-react";

import api from "../../services/api";

type Booking = {
  _id: string;
  bookingCode: string;
  status: string;
  createdAt?: string;
  pickup?: { address?: string };
  drop?: { address?: string };
};

type PopulatedBooking = {
  _id: string;
  bookingCode?: string;
  status?: string;
};

type Review = {
  _id: string;
  booking: PopulatedBooking | string | null;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  driver?: { name?: string } | string | null;
};

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

function bookingIdOf(review: Review) {
  return typeof review.booking === "object" && review.booking ? review.booking._id : review.booking;
}

function bookingCodeOf(review: Review) {
  return typeof review.booking === "object" && review.booking
    ? review.booking.bookingCode || "Booking"
    : "Booking";
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function CustomerReviews() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const [bookingResponse, reviewResponse] = await Promise.all([
        api.get("/bookings/my", { params: { page: 1, limit: 100 } }),
        api.get("/reviews/mine"),
      ]);
      if (!bookingResponse.data?.success || !reviewResponse.data?.success) {
        throw new Error("Unable to load your bookings and reviews.");
      }
      setBookings(Array.isArray(bookingResponse.data.bookings) ? bookingResponse.data.bookings : []);
      setReviews(Array.isArray(reviewResponse.data.reviews) ? reviewResponse.data.reviews : []);
    } catch (error: unknown) {
      setPageError(errorMessage(error, "Unable to load your review information."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const eligibleBookings = useMemo(() => {
    const reviewedIds = new Set(reviews.map(bookingIdOf).filter(Boolean));
    return bookings.filter(
      (booking) => booking.status === "delivered" && !reviewedIds.has(booking._id),
    );
  }, [bookings, reviews]);

  useEffect(() => {
    if (!eligibleBookings.some((booking) => booking._id === bookingId)) {
      setBookingId(eligibleBookings[0]?._id ?? "");
    }
  }, [eligibleBookings, bookingId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    if (!bookingId) {
      setSubmitError("Choose a delivered booking to review.");
      return;
    }
    if (comment.trim().length < 2) {
      setSubmitError("Please write at least 2 characters of feedback.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/reviews", {
        bookingId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to submit your review.");
      }
      setSuccessMessage(response.data.message || "Thanks! Your review was submitted.");
      setTitle("");
      setComment("");
      setRating(5);
      await loadData();
    } catch (error: unknown) {
      setSubmitError(errorMessage(error, "Unable to submit your review."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange-700 sm:text-xs"><Star className="h-3.5 w-3.5" /> Your experience matters</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Rate your delivery</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Tell us how your delivery went. Reviews are available only for completed deliveries, and each booking can be reviewed once.</p>

          <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><MessageSquareText className="h-5 w-5" /></span><div><h2 className="text-lg font-black">Write a review</h2><p className="mt-1 text-sm leading-5 text-slate-500">Your feedback helps us improve future deliveries.</p></div></div>

            {pageError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}<button type="button" onClick={() => void loadData()} className="ml-2 inline-flex items-center gap-1 font-bold underline"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>}
            {successMessage && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{successMessage}</div>}
            {submitError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}

            {loading ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading delivered bookings…</div>
            ) : eligibleBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><PackageCheck className="h-6 w-6" /></span><h3 className="mt-4 font-extrabold text-slate-800">No reviewable deliveries yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">After a booking is marked delivered, it will appear here unless you have already reviewed it.</p><Link to="/customer/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-orange-700 hover:text-orange-800">View my orders <ArrowRight className="h-4 w-4" /></Link></div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-slate-700">Delivered booking<select required value={bookingId} onChange={(event) => setBookingId(event.target.value)} className={inputClass}><option value="">Choose a booking</option>{eligibleBookings.map((booking) => <option key={booking._id} value={booking._id}>{booking.bookingCode} · {booking.pickup?.address || "Pickup"} → {booking.drop?.address || "Drop"}</option>)}</select></label>
                <fieldset><legend className="text-sm font-bold text-slate-700">Your rating</legend><div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Rating from one to five stars">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} onClick={() => setRating(value)} className={`rounded-xl p-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${value <= rating ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}><Star className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" /></button>)}<span className="ml-2 text-sm font-extrabold text-slate-700">{rating}/5</span></div></fieldset>
                <label className="block text-sm font-bold text-slate-700">Review title <span className="font-medium text-slate-400">(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="e.g. Quick and careful delivery" className={inputClass} /></label>
                <label className="block text-sm font-bold text-slate-700">Your feedback<textarea required minLength={2} maxLength={1000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What went well? What could we improve?" className={`${inputClass} resize-y`} /><span className="mt-1.5 block text-right text-xs font-medium text-slate-400">{comment.length}/1000</span></label>
                <button type="submit" disabled={submitting || !bookingId} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <><RefreshCw className="h-4 w-4 animate-spin" />Submitting…</> : <>Submit review <ArrowRight className="h-4 w-4" /></>}</button>
              </form>
            )}
          </div>
        </section>

        <aside className="min-w-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">Your past reviews</h2><p className="mt-1 text-sm text-slate-500">Reviews submitted from this account.</p></div><span className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-700">{reviews.length}</span></div>
            {loading ? <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Loading reviews…</div> : reviews.length === 0 ? <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-8 text-center"><Star className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No reviews submitted yet</p><p className="mt-1 text-sm text-slate-500">Your submitted reviews will be listed here.</p></div> : <div className="mt-5 space-y-3">{reviews.map((review) => <article key={review._id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-slate-800">{bookingCodeOf(review)}</p><span className="text-xs font-semibold text-slate-500">{formatDate(review.createdAt)}</span></div><div className="mt-2 flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" />)}<span className="ml-1 text-xs font-bold text-slate-600">{review.rating}/5</span></div>{review.title && <h3 className="mt-3 text-sm font-extrabold text-slate-800">{review.title}</h3>}<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{review.comment}</p></article>)}</div>}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600"><CheckCircle2 className="h-4 w-4" /></span><p className="text-sm leading-6 text-slate-600"><strong className="text-slate-800">One booking, one review.</strong> The server verifies that the booking belongs to you and has been delivered before accepting your review.</p></div>
        </aside>
      </main>
    </div>
  );
}

export default CustomerReviews;
