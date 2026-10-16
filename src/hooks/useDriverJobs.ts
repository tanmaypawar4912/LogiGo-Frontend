import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import api from "../services/api";

export type BookingStatus = "pending" | "assigned" | "accepted" | "arriving_at_pickup" | "arrived_at_pickup" | "picked_up" | "in_transit" | "arrived_at_drop" | "delivered" | "cancelled";
export type JobFilter = "all" | "action" | "active" | "completed";
export interface DriverJob {
  _id: string;
  bookingCode?: string;
  status: BookingStatus;
  createdAt?: string;
  updatedAt?: string;
  pickup?: { address?: string };
  drop?: { address?: string };
  package?: { description?: string; weightKg?: number; specialInstructions?: string };
  route?: { distanceKm?: number; durationMinutes?: number };
  vehicle?: { _id?: string; name?: string; capacityKg?: number } | string | null;
  fare?: { estimatedFare?: number; finalFare?: number | null; currency?: string };
  customer?: { name?: string; phone?: string } | string | null;
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function formatDriverPrice(amount?: number | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
export function getDriverError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return "Your session may have expired. Please log in again.";
    if (status === 403) return error.response?.data?.message || "This account does not have permission to access driver jobs.";
    if (status === 404) return error.response?.data?.message || "The requested driver resource was not found.";
    if (status === 429) return "Too many requests. Wait a moment before trying again.";
    return error.response?.data?.message || (error.code === "ERR_NETWORK" ? "Cannot connect to LogiGo. Check that the backend is running." : fallback);
  }
  return error instanceof Error ? error.message : fallback;
}

export function useDriverJobs() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestInProgress = useRef(false);

  const loadJobs = useCallback(async (silent = false) => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    if (silent) setRefreshing(true); else { setLoading(true); setError(""); }
    try {
      const response = await api.get("/bookings/driver/jobs");
      if (response.data?.success === false) throw new Error(response.data.message || "Could not load driver jobs.");
      const items = response.data?.bookings ?? response.data?.jobs ?? [];
      if (!Array.isArray(items)) throw new Error("The jobs response was not in the expected format.");
      setJobs(items as DriverJob[]);
      setError("");
    } catch (requestError: unknown) {
      setError(getDriverError(requestError, "Could not load driver jobs."));
    } finally {
      requestInProgress.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);
  return { jobs, loading, refreshing, error, loadJobs, setJobs };
}