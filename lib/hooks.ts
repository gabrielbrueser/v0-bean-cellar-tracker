"use client";

import useSWR from "swr";
import { fetcher } from "./fetcher";

export function useInventory(cellarId?: string | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const url = cellarId ? `/api/inventory?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useVials(cellarId?: string | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const url = cellarId ? `/api/vials?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useCoffees(cellarId?: string | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const url = cellarId ? `/api/coffees?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useDoseTypes() {
  return useSWR("/api/dose-types", fetcher);
}

export function useProcessMethods() {
  return useSWR("/api/process-methods", fetcher);
}

export function useVial(id: string | null, cellarId?: string | null) {
  // Include cellarId for scoped fetch
  const url = id && cellarId ? `/api/vials/${id}?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useActiveFillSession(vialId: string | null, cellarId?: string | null) {
  const url = vialId && cellarId ? `/api/vials/${vialId}/fill-sessions?cellarId=${cellarId}` : null;
  const { data: sessions, ...rest } = useSWR(url, fetcher);
  // The active fill is the first one with status FULL
  const activeFill = sessions?.find(
    (s: { status: string }) => s.status === "FULL"
  );
  return { data: activeFill ?? null, ...rest };
}

export function useFillSessions(vialId: string | null, cellarId?: string | null) {
  const url = vialId && cellarId ? `/api/vials/${vialId}/fill-sessions?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useCoffee(id: string | null, cellarId?: string | null) {
  const url = id && cellarId ? `/api/coffees/${id}?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useActivity(cellarId?: string | null) {
  // Scoped to cellar
  const url = cellarId ? `/api/activity?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useAllVials(cellarId?: string | null, status?: "FULL" | "EMPTY" | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  if (!cellarId) return useSWR(null, fetcher);
  const params = new URLSearchParams();
  params.set("cellarId", cellarId);
  if (status) params.set("status", status);
  const url = `/api/vials/all?${params.toString()}`;
  return useSWR(url, fetcher);
}

export function useCoffeeTimeline(coffeeId: string | null, cellarId?: string | null) {
  const url = coffeeId && cellarId ? `/api/coffees/${coffeeId}/timeline?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useHomeData(cellarId?: string | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const url = cellarId ? `/api/home?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useCellars() {
  return useSWR("/api/cellars", fetcher);
}

export function useCellarInvites(cellarId: string | null) {
  return useSWR(cellarId ? `/api/cellars/${cellarId}/invites` : null, fetcher);
}

export function useBrewLogs(cellarId?: string | null, limit?: number) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  if (!cellarId) return useSWR(null, fetcher);
  const params = new URLSearchParams();
  params.set("cellarId", cellarId);
  if (limit) params.set("limit", limit.toString());
  const url = `/api/brew?${params.toString()}`;
  return useSWR(url, fetcher);
}

export function useBrewStats(cellarId?: string | null) {
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const url = cellarId ? `/api/brew/stats?cellarId=${cellarId}` : null;
  return useSWR(url, fetcher);
}

export function useLastGrindSettings(coffeeId: string | null, brewMethod: string | null, cellarId?: string | null) {
  const url = coffeeId && brewMethod && cellarId 
    ? `/api/brew/last-grind?coffeeId=${coffeeId}&brewMethod=${brewMethod}&cellarId=${cellarId}` 
    : null;
  return useSWR(url, fetcher);
}
