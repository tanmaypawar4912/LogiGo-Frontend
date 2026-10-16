import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  CalendarDays,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  Truck,
  X,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import api from "../../services/api";

type ReviewUser = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type Review = {
  _id: string;
  rating?: number;
  comment?: string;
  review?: string;
  feedback?: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: ReviewUser | string | null;
  user?: ReviewUser | string | null;
  driver?: ReviewUser | string | null;
  driverName?: string;
  booking?: { _id?: string; bookingCode?: string } | string | null;
  bookingCode?: string;
  title?: string;
};

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

const cardClass =
  "rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.035)]";

const formatDate = (value?: string) => {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getText = (value: unknown, fallback = "Not available") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const getUserName = (value: ReviewUser | string | null | undefined) => {
  if (typeof value === "string") return value || "Customer";
  return value?.name || value?.email || "Customer";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return "You do not have permission to view reviews.";
    if (status === 404) return "The reviews endpoint was not found. Verify the LogiGo backend review route.";
    if (status === 429) return "Too many requests. Wait a moment, then refresh.";
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo API. Check that the backend is running."
        : fallback)
    );
  }
  return error instanceof Error ? error.message : fallback;
};

function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
    </span>
  );
}

function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const loadReviews = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // Read-only admin request. Confirm this route exists in the LogiGo backend.
      const response = await api.get("/reviews/admin");
      if (response.data?.success === false) {
        throw new Error(response.data.message || "Unable to load reviews.");
      }
      const list = response.data?.reviews ?? response.data?.data?.reviews ?? response.data?.data;
      setReviews(Array.isArray(list) ? list : []);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load reviews."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const reviewStats = useMemo(() => {
    const count = reviews.length;
    const total = reviews.reduce((sum, review) => {
      const rating = Number(review.rating) || 0;
      return sum + (rating >= 1 && rating <= 5 ? rating : 0);
    }, 0);
    const validRatings = reviews.filter((review) => {
      const rating = Number(review.rating);
      return rating >= 1 && rating <= 5;
    }).length;
    const lowRatings = reviews.filter((review) => Number(review.rating) <= 2 && Number(review.rating) >= 1).length;
    const highRatings = reviews.filter((review) => Number(review.rating) >= 4 && Number(review.rating) <= 5).length;
    return {
      count,
      average: validRatings ? total / validRatings : 0,
      lowRatings,
      highRatings,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...reviews]
      .filter((review) => {
        const rating = String(Number(review.rating) || 0);
        const author = getUserName(review.customer ?? review.user);
        const driver = typeof review.driver === "object" && review.driver ? review.driver.name : review.driver;
        const booking = typeof review.booking === "object" && review.booking ? review.booking.bookingCode : review.booking;
        const text = [
          author,
          typeof review.customer === "object" ? review.customer?.email : "",
          typeof review.user === "object" ? review.user?.email : "",
          driver,
          booking,
          review.bookingCode,
          review.comment,
          review.review,
          review.feedback,
          review.title,
        ].filter(Boolean).join(" ").toLowerCase();
        const matchesSearch = !term || text.includes(term);
        const matchesRating = ratingFilter === "all" || rating === ratingFilter;
        return matchesSearch && matchesRating;
      })
      .sort((a, b) => new Date(b.createdAt ?? b.updatedAt ?? 0).getTime() - new Date(a.createdAt ?? a.updatedAt ?? 0).getTime());
  }, [reviews, search, ratingFilter]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-tight text-slate-900">LogiGo</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Admin workspace</span>
            </span>
          </Link>
          <Link to="/admin" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">Customer experience</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Reviews & feedback</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review customer feedback, monitor ratings and find comments that may need attention.</p>
          </div>
          <button type="button" onClick={() => void loadReviews(true)} disabled={loading || refreshing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh reviews"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">Could not load reviews</p><p className="mt-1 text-sm leading-6">{error}</p></div>
            <button type="button" onClick={() => void loadReviews(true)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold hover:bg-rose-100">Retry</button>
          </div>
        )}

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Review statistics">
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500 sm:text-sm">Total reviews</span><span className="rounded-xl bg-orange-50 p-2 text-orange-600"><MessageSquareText className="h-4 w-4" /></span></div>
            <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{loading ? "—" : reviewStats.count}</p>
            <p className="mt-1 text-xs text-slate-400">Feedback received</p>
          </div>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500 sm:text-sm">Average rating</span><span className="rounded-xl bg-amber-50 p-2 text-amber-600"><Star className="h-4 w-4 fill-current" /></span></div>
            <div className="mt-3 flex items-center gap-2"><p className="text-2xl font-black tracking-tight sm:text-3xl">{loading ? "—" : reviewStats.average.toFixed(1)}</p><span className="text-xs text-slate-400">/ 5</span></div>
            <div className="mt-1"><RatingStars rating={Math.round(reviewStats.average)} /></div>
          </div>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500 sm:text-sm">Positive ratings</span><span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><TrendingUp className="h-4 w-4" /></span></div>
            <p className="mt-3 text-2xl font-black tracking-tight text-emerald-700 sm:text-3xl">{loading ? "—" : reviewStats.highRatings}</p>
            <p className="mt-1 text-xs text-slate-400">4–5 star feedback</p>
          </div>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500 sm:text-sm">Low ratings</span><span className="rounded-xl bg-rose-50 p-2 text-rose-600"><AlertCircle className="h-4 w-4" /></span></div>
            <p className="mt-3 text-2xl font-black tracking-tight text-rose-700 sm:text-3xl">{loading ? "—" : reviewStats.lowRatings}</p>
            <p className="mt-1 text-xs text-slate-400">1–2 star feedback</p>
          </div>
        </section>

        <section className={`${cardClass} mt-6 p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search comments, customer, driver or booking…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span className="shrink-0">Rating</span>
              <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value as RatingFilter)} className="min-h-11 min-w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                <option value="all">All ratings</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{loading ? "Loading reviews…" : `Showing ${filteredReviews.length} of ${reviews.length} reviews`}</span>{(search || ratingFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setRatingFilter("all"); }} className="font-bold text-orange-700 hover:text-orange-800">Clear filters</button>}</div>
        </section>

        <section className="mt-5 space-y-3" aria-label="Review list">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className={`${cardClass} animate-pulse p-5`}><div className="h-4 w-36 rounded bg-slate-200" /><div className="mt-4 h-3 w-24 rounded bg-slate-100" /><div className="mt-4 h-12 rounded-xl bg-slate-100" /></div>)
          ) : filteredReviews.length === 0 ? (
            <div className={`${cardClass} flex flex-col items-center px-5 py-14 text-center sm:py-16`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><MessageSquareText className="h-7 w-7" /></span>
              <h2 className="mt-4 text-lg font-black">{error ? "Reviews are unavailable" : reviews.length ? "No reviews match your filters" : "No reviews yet"}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{error ? "Check the backend reviews route and your server connection, then try again." : reviews.length ? "Try a different search phrase or rating." : "Customer feedback will appear here once reviews are returned by the API."}</p>
              {!error && (search || ratingFilter !== "all") && <button type="button" onClick={() => { setSearch(""); setRatingFilter("all"); }} className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600">Clear filters</button>}
            </div>
          ) : (
            filteredReviews.map((review) => {
              const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0)));
              const author = getUserName(review.customer ?? review.user);
              const authorEmail = typeof review.customer === "object" && review.customer ? review.customer.email : typeof review.user === "object" && review.user ? review.user.email : undefined;
              const driverName = typeof review.driver === "object" && review.driver ? review.driver.name : typeof review.driver === "string" ? review.driver : review.driverName;
              const bookingCode = typeof review.booking === "object" && review.booking ? review.booking.bookingCode : typeof review.booking === "string" ? review.booking : review.bookingCode;
              const comment = getText(review.comment ?? review.review ?? review.feedback, "No written comment provided.");
              return (
                <article key={review._id} className={`${cardClass} p-4 transition hover:border-orange-200/80 sm:p-5`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="truncate text-base font-extrabold text-slate-900">{author}</h2><span className="inline-flex items-center gap-1 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDate(review.createdAt ?? review.updatedAt)}</span></div>
                        {authorEmail && <p className="mt-1 break-all text-xs text-slate-500">{authorEmail}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2"><RatingStars rating={rating} /><span className="text-xs font-extrabold text-slate-700">{rating ? `${rating}.0 / 5` : "No rating"}</span></div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedReview(review)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">View details</button>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{comment}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    {bookingCode && <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Booking: <strong className="text-slate-600">{bookingCode}</strong></span>}
                    {driverName && <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Driver: <strong className="text-slate-600">{driverName}</strong></span>}
                    <span className="ml-auto text-[10px] text-slate-300">ID: {review._id.slice(-8)}</span>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="text-sm font-extrabold text-blue-950">Reviews API connection</p><p className="mt-1 text-sm leading-6 text-blue-900/75">This page currently reads from <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">GET /reviews/admin</code>. Confirm that this route and its response format are implemented in the LogiGo backend. No review deletion or moderation requests are sent from this page.</p></div></div>
        </aside>
      </main>

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReview(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Review details</p><h2 id="review-dialog-title" className="mt-2 text-xl font-black text-slate-950">{getUserName(selectedReview.customer ?? selectedReview.user)}</h2></div><button type="button" aria-label="Close review details" onClick={() => setSelectedReview(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><RatingStars rating={Math.max(0, Math.min(5, Math.round(Number(selectedReview.rating) || 0)))} size="lg" /><span className="text-sm font-black text-amber-800">{Number(selectedReview.rating) ? `${Number(selectedReview.rating)} / 5` : "No rating"}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{getText(selectedReview.comment ?? selectedReview.review ?? selectedReview.feedback, "No written comment provided.")}</p></div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3.5"><dt className="text-xs font-bold text-slate-400">Submitted</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{formatDate(selectedReview.createdAt ?? selectedReview.updatedAt)}</dd></div><div className="rounded-xl bg-slate-50 p-3.5"><dt className="text-xs font-bold text-slate-400">Booking reference</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{getText(typeof selectedReview.booking === "object" && selectedReview.booking ? selectedReview.booking.bookingCode : selectedReview.booking ?? selectedReview.bookingCode)}</dd></div><div className="rounded-xl bg-slate-50 p-3.5"><dt className="text-xs font-bold text-slate-400">Customer email</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-800">{getText(typeof selectedReview.customer === "object" && selectedReview.customer ? selectedReview.customer.email : typeof selectedReview.user === "object" && selectedReview.user ? selectedReview.user.email : undefined)}</dd></div><div className="rounded-xl bg-slate-50 p-3.5"><dt className="text-xs font-bold text-slate-400">Review ID</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-800">{selectedReview._id}</dd></div></dl>
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setSelectedReview(null)} className="min-h-11 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Close details</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminReviews;
