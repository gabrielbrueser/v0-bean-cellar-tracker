"use client";

import { useState, useCallback } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { useActiveFillSession } from "./hooks";

export function useVialAction(vialId: string, cellarId?: string | null) {
  const { data: activeFill } = useActiveFillSession(vialId);
  const [loading, setLoading] = useState(false);
  const cellarParam = cellarId ? `cellarId=${cellarId}` : "";

  const handleUse = useCallback(async () => {
    if (!activeFill) return;
    if (!cellarId) {
      toast.error("No cellar selected");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/use?${cellarParam}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Coffee used!", { description: "Vial marked as empty." });
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate(`/api/inventory?${cellarParam}`);
      mutate(`/api/vials?${cellarParam}`);
    } catch {
      toast.error("Failed to mark vial as used");
    } finally {
      setLoading(false);
    }
  }, [activeFill, vialId, cellarId, cellarParam]);

  return { handleUse, loading };
}
