"use client";

import { use } from "react";
import { VialDetail } from "@/components/vial-detail";

export default function VialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <VialDetail vialId={id} />
    </div>
  );
}
