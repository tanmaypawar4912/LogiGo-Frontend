import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import api from "../services/api";

export type BookingStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "arriving_at_pickup"
  | "arrived_at_pickup"
  | "picked_up"
  | "in_transit"
  | "arrived_at_drop"
  | "delivered"
  | "cancelled";

export type JobFilter = "all" | "action" | "active" | "completed";

export interface DriverJob {
  _id: string;
  bookingCode?: string;
  status: BookingStatus;
  createdAt?: string;
  updatedAt?: string;
  pickup?: { address?: string };
  drop?: { address?: string };
  package?: {
    description?: string;
    weightKg?: number;
    specialInstructions?: string;
  };
  route?: { distanceKm?: number; durationMinutes?: number };
  vehicle?: { _id?: string; name?: string; capacityKg?: number; slug?: string } | string | null;
  fare?: { estimatedFare?: number; finalFare?: number | null; currency?: string };
  customer?: { name?: string; phone?: string; email?: string } | string | null;
  dispatch?: {
    status?: "searching" | "offering" | "accepted" | "exhausted";
    offers?: {
      driver?: string;
      status?: "offered" | "accepted" | "rejected" | "expired" | "lost";
      offeredAt?: string;
      expiresAt?: string;
    }[];
  };
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDriverPrice(amount?: number | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDriverError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return error.response?.data?.message || "This account does not have permission to access driver jobs.";
    if (status === 404) return error.response?.data?.message || "The requested driver resource was not found.";
    if (status === 409) return error.response?.data?.message || "This job has changed or is no longer available. Refresh the list.";
    if (status === 429) return "Too many requests. Wait a moment before trying again.";
    return error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot connect to LogiGo. Check that the backend is running." : fallback);
  }
  return error instanceof Error ? error.message : fallback;
}

export function useDriverJobs() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [offers, setOffers] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestInProgress = useRef(false);

  const loadJobs = useCallback(async (silent = false) => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;

    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError("");
    }

    try {
      const response = await api.get("/bookings/driver/jobs");
      if (response.data?.success === false) {
        throw new Error(response.data.message || "Could not load driver jobs.");
      }

      const items = response.data?.bookings ?? response.data?.jobs ?? [];
      const offerItems = response.data?.offers ?? [];

      if (!Array.isArray(items) || !Array.isArray(offerItems)) {
        throw new Error("The driver jobs response was not in the expected format.");
      }

      setJobs(items as DriverJob[]);
      setOffers(offerItems as DriverJob[]);
      setError("");
    } catch (requestError: unknown) {
      setError(getDriverError(requestError, "Could not load driver jobs."));
    } finally {
      requestInProgress.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();

    // Offers are time-sensitive. Poll lightly instead of requiring manual refresh
    // or introducing a new WebSocket dependency into the existing project.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadJobs(true);
      }
    }, 15000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadJobs(true);
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadJobs]);

  return { jobs, offers, loading, refreshing, error, loadJobs, setJobs, setOffers };
}
