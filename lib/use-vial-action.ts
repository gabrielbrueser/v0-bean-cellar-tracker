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
      const { useVial } = await import("./firestore");
      await useVial(activeFill.id, vialId);
      toast.success("Coffee used!", { description: "Vial marked as empty." });
      mutate(`vial-${vialId}`);
      mutate(`fill-active-${vialId}`);
      mutate(`fill-sessions-${vialId}`);
      mutate("inventory");
      mutate("vials");
    } catch {
      toast.error("Failed to mark vial as used");
    } finally {
      setLoading(false);
    }
  }, [activeFill, vialId]);

  return { handleUse, loading };
}
