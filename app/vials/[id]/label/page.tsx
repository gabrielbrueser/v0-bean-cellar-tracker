"use client";

import { use } from "react";
import { VialLabel } from "@/components/vial-label";

export default function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VialLabel vialId={id} />;
}
