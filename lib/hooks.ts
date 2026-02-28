"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInventory(cellarId?: string | null) {
  const url = cellarId ? `/api/inventory?cellarId=${cellarId}` : "/api/inventory";
  return useSWR(url, fetcher);
}

export function useVials() {
  return useSWR("/api/vials", fetcher);
}

export function useCoffees(cellarId?: string | null) {
  const url = cellarId ? `/api/coffees?cellarId=${cellarId}` : "/api/coffees";
  return useSWR(url, fetcher);
}

export function useDoseTypes() {
  return useSWR("/api/dose-types", fetcher);
}

export function useProcessMethods() {
  return useSWR("/api/process-methods", fetcher);
}

export function useVial(id: string | null) {
  return useSWR(id ? `/api/vials/${id}` : null, fetcher);
}

export function useActiveFillSession(vialId: string | null) {
  const { data: sessions, ...rest } = useSWR(
    vialId ? `/api/vials/${vialId}/fill-sessions` : null,
    fetcher
  );
  // The active fill is the first one with status FULL
  const activeFill = sessions?.find(
    (s: { status: string }) => s.status === "FULL"
  );
  return { data: activeFill ?? null, ...rest };
}

export function useFillSessions(vialId: string | null) {
  return useSWR(
    vialId ? `/api/vials/${vialId}/fill-sessions` : null,
    fetcher
  );
}

export function useCoffee(id: string | null) {
  return useSWR(id ? `/api/coffees/${id}` : null, fetcher);
}

export function useActivity() {
  return useSWR("/api/activity", fetcher);
}

export function useAllVials(status?: "FULL" | "EMPTY" | null) {
  const url = status ? `/api/vials/all?status=${status}` : "/api/vials/all";
  return useSWR(url, fetcher);
}

export function useCoffeeTimeline(coffeeId: string | null) {
  return useSWR(coffeeId ? `/api/coffees/${coffeeId}/timeline` : null, fetcher);
}

export function useHomeData(cellarId?: string | null) {
  const url = cellarId ? `/api/home?cellarId=${cellarId}` : "/api/home";
  return useSWR(url, fetcher);
}

export function useCellars() {
  return useSWR("/api/cellars", fetcher);
}

export function useCellarInvites(cellarId: string | null) {
  return useSWR(cellarId ? `/api/cellars/${cellarId}/invites` : null, fetcher);
}

export function useBrewLogs(cellarId?: string | null, limit?: number) {
  let url = "/api/brew";
  const params = new URLSearchParams();
  if (cellarId) params.set("cellarId", cellarId);
  if (limit) params.set("limit", limit.toString());
  if (params.toString()) url += `?${params.toString()}`;
  return useSWR(url, fetcher);
}

export function useBrewStats(cellarId?: string | null) {
  const url = cellarId ? `/api/brew/stats?cellarId=${cellarId}` : "/api/brew/stats";
  return useSWR(url, fetcher);
}

export function useLastGrindSettings(coffeeId: string | null, brewMethod: string | null) {
  return useSWR(
    coffeeId && brewMethod ? `/api/brew/last-grind?coffeeId=${coffeeId}&brewMethod=${brewMethod}` : null,
    fetcher
  );
}
