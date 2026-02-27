"use client";

import useSWR from "swr";
import {
  getInventorySummary,
  getVials,
  getCoffees,
  getDoseTypes,
  getProcessMethods,
  getVial,
  getActiveFillSession,
  getFillSessionsForVial,
  getCoffee,
} from "./firestore";

export function useInventory() {
  return useSWR("inventory", getInventorySummary);
}

export function useVials() {
  return useSWR("vials", getVials);
}

export function useCoffees() {
  return useSWR("coffees", getCoffees);
}

export function useDoseTypes() {
  return useSWR("doseTypes", getDoseTypes);
}

export function useProcessMethods() {
  return useSWR("processMethods", getProcessMethods);
}

export function useVial(id: string | null) {
  return useSWR(id ? `vial-${id}` : null, () => (id ? getVial(id) : null));
}

export function useActiveFillSession(vialId: string | null) {
  return useSWR(vialId ? `fill-active-${vialId}` : null, () =>
    vialId ? getActiveFillSession(vialId) : null
  );
}

export function useFillSessions(vialId: string | null) {
  return useSWR(vialId ? `fill-sessions-${vialId}` : null, () =>
    vialId ? getFillSessionsForVial(vialId) : null
  );
}

export function useCoffee(id: string | null) {
  return useSWR(id ? `coffee-${id}` : null, () =>
    id ? getCoffee(id) : null
  );
}
