"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDoseTypes } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Beaker, Printer } from "lucide-react";
import Link from "next/link";

export default function CreateVialPage() {
  const router = useRouter();
  const { data: doseTypes, isLoading } = useDoseTypes();
  const [loading, setLoading] = useState(false);
  const [createdVialId, setCreatedVialId] = useState<string | null>(null);
  const [createdVialCode, setCreatedVialCode] = useState<string | null>(null);

  const handleCreate = async (doseTypeId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/vials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doseTypeId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(errorData.error || "Failed to create vial");
      }
      const vial = await res.json();
      setCreatedVialId(vial.id);
      setCreatedVialCode(vial.vialCode);
      toast.success(`Vial ${vial.vialCode} created!`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create vial");
    } finally {
      setLoading(false);
    }
  };

  if (createdVialId && createdVialCode) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Vial Created</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <Beaker className="size-10 text-primary" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {createdVialCode}
            </p>
            <p className="text-sm text-center text-muted-foreground">
              This vial has a permanent QR code. Print the label and stick it on your vial.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Link href={`/vials/${createdVialId}/label`} className="w-full">
                <Button className="w-full gap-2" size="lg">
                  <Printer className="size-4" />
                  Print Label
                </Button>
              </Link>
              <Link href={`/vials/${createdVialId}`} className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  View Vial Details
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCreatedVialId(null);
                  setCreatedVialCode(null);
                }}
              >
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Create New Vial</h1>
          <p className="text-sm text-muted-foreground">
            Choose a dose type to create a new vial with a permanent QR code
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {doseTypes?.map((dt) => (
            <button
              key={dt.id}
              onClick={() => handleCreate(dt.id)}
              disabled={loading}
              className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-secondary/50 hover:border-primary/30 disabled:opacity-50"
            >
              <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Beaker className="size-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">
                  {dt.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dt.gramsPerDose}g per dose
                </p>
                <Badge variant="outline" className="mt-1 font-mono text-xs">
                  {dt.prefix}-###
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
