"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInventory() {
  return useSWR("/api/inventory", fetcher);
}

export function useVials() {
  return useSWR("/api/vials", fetcher);
}

export function useCoffees() {
  return useSWR("/api/coffees", fetcher);
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

export function useHomeData() {
  return useSWR("/api/home", fetcher);
}
