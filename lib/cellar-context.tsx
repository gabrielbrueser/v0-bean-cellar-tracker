"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCellars } from "./hooks";

interface Cellar {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  memberCount: number;
  createdAt: string;
}

interface CellarContextType {
  cellars: Cellar[];
  currentCellar: Cellar | null;
  setCurrentCellarId: (id: string) => void;
  isLoading: boolean;
  refetch: () => void;
}

const CellarContext = createContext<CellarContextType | null>(null);

const CELLAR_STORAGE_KEY = "bean-cellar-current-cellar-id";

export function CellarProvider({ children }: { children: ReactNode }) {
  const { data: cellars = [], isLoading, mutate } = useCellars();
  const [currentCellarId, setCurrentCellarIdState] = useState<string | null>(null);

  // Load saved cellar from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(CELLAR_STORAGE_KEY);
    if (savedId) {
      setCurrentCellarIdState(savedId);
    }
  }, []);

  // Auto-select first cellar if none selected
  useEffect(() => {
    if (!isLoading && cellars.length > 0 && !currentCellarId) {
      const savedId = localStorage.getItem(CELLAR_STORAGE_KEY);
      const validSavedId = savedId && cellars.some((c: Cellar) => c.id === savedId);
      
      if (validSavedId) {
        setCurrentCellarIdState(savedId);
      } else {
        setCurrentCellarIdState(cellars[0].id);
        localStorage.setItem(CELLAR_STORAGE_KEY, cellars[0].id);
      }
    }
  }, [cellars, isLoading, currentCellarId]);

  const setCurrentCellarId = (id: string) => {
    setCurrentCellarIdState(id);
    localStorage.setItem(CELLAR_STORAGE_KEY, id);
  };

  const currentCellar = cellars.find((c: Cellar) => c.id === currentCellarId) || null;

  return (
    <CellarContext.Provider
      value={{
        cellars,
        currentCellar,
        setCurrentCellarId,
        isLoading,
        refetch: mutate,
      }}
    >
      {children}
    </CellarContext.Provider>
  );
}

export function useCellarContext() {
  const ctx = useContext(CellarContext);
  if (!ctx) {
    throw new Error("useCellarContext must be used within CellarProvider");
  }
  return ctx;
}
