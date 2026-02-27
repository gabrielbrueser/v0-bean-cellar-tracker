"use client";

import { useEffect, useRef } from "react";
import { seedDefaults } from "@/lib/firestore";

export function FirebaseInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    seedDefaults().catch((err) => {
      console.error("Failed to seed defaults:", err);
    });
  }, []);

  return null;
}
