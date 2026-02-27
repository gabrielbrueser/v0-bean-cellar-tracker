"use client";

import { useState, useCallback } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { useActiveFillSession } from "./hooks";

export function useVialAction(vialId: string) {
  const { data: activeFill } = useActiveFillSession(vialId);
  const [loading, setLoading] = useState(false);

  const handleUse = useCallback(async () => {
    if (!activeFill) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/use`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Coffee used!", { description: "Vial marked as empty." });
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate("/api/inventory");
      mutate("/api/vials");
    } catch {
      toast.error("Failed to mark vial as used");
    } finally {
      setLoading(false);
    }
  }, [activeFill, vialId]);

  return { handleUse, loading };
}
