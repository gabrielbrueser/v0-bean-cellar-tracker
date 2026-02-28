"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { toast } from "sonner";
import { useCoffees, useDoseTypes, useAllVials } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Package, CheckCircle2 } from "lucide-react";

export default function BatchSealPage() {
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data: coffees, isLoading: coffeesLoading } = useCoffees(currentCellar?.id);
  const { data: doseTypes, isLoading: doseTypesLoading } = useDoseTypes();
  const { data: allVials, isLoading: vialsLoading } = useAllVials(currentCellar?.id, "EMPTY");
  
  const [coffeeId, setCoffeeId] = useState("");
  const [roastDate, setRoastDate] = useState("");
  const [selectedVials, setSelectedVials] = useState<string[]>([]);
  const [customGrams, setCustomGrams] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Helper for cellar-scoped SWR keys
  const cellarParam = currentCellar?.id ? `cellarId=${currentCellar.id}` : "";

  // Filter to only empty vials
  const emptyVials = allVials?.filter((v: { status: string }) => v.status === "EMPTY") || [];

  // Group vials by dose type for easier selection
  const vialsByDoseType = emptyVials.reduce((acc: Record<string, typeof emptyVials>, vial: { doseTypeId: string }) => {
    if (!acc[vial.doseTypeId]) acc[vial.doseTypeId] = [];
    acc[vial.doseTypeId].push(vial);
    return acc;
  }, {});

  const toggleVial = (vialId: string) => {
    setSelectedVials((prev) =>
      prev.includes(vialId)
        ? prev.filter((id) => id !== vialId)
        : [...prev, vialId]
    );
  };

  const selectAllOfType = (doseTypeId: string) => {
    const vialsOfType = vialsByDoseType[doseTypeId]?.map((v: { id: string }) => v.id) || [];
    const allSelected = vialsOfType.every((id: string) => selectedVials.includes(id));
    
    if (allSelected) {
      setSelectedVials((prev) => prev.filter((id) => !vialsOfType.includes(id)));
    } else {
      setSelectedVials((prev) => [...new Set([...prev, ...vialsOfType])]);
    }
  };

  const getGramsForVial = (vial: { id: string; doseTypeId: string }) => {
    if (customGrams[vial.id]) return customGrams[vial.id];
    const doseType = doseTypes?.find((dt: { id: string }) => dt.id === vial.doseTypeId);
    return doseType?.gramsPerDose || 18;
  };

  const handleBatchSeal = async () => {
    if (!coffeeId || !roastDate || selectedVials.length === 0) {
      toast.error("Please select a coffee, roast date, and at least one dose");
      return;
    }

    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const vialId of selectedVials) {
      const vial = emptyVials.find((v: { id: string }) => v.id === vialId);
      if (!vial) continue;

      try {
        const res = await fetch(`/api/vials/${vialId}/fill?${cellarParam}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coffeeId,
            doseTypeId: vial.doseTypeId,
            roastDate,
            gramsPerDose: getGramsForVial(vial),
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      setCompleted(true);
      // Mutate with exact SWR keys
      mutate(`/api/inventory?${cellarParam}`);
      mutate(`/api/vials/all?${cellarParam}`);
      mutate(`/api/vials?${cellarParam}`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to seal ${errorCount} dose(s)`);
    }

    setLoading(false);
  };

  // Loading state
  if (cellarLoading || !currentCellar?.id || coffeesLoading || doseTypesLoading || vialsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground">Batch Sealed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedVials.length} dose(s) have been sealed with {coffees?.find((c: { id: string }) => c.id === coffeeId)?.coffeeName}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/inventory">
                  <Button>View Inventory</Button>
                </Link>
                <Button variant="outline" onClick={() => {
                  setCompleted(false);
                  setSelectedVials([]);
                  setCoffeeId("");
                  setRoastDate("");
                }}>
                  Seal More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/inventory">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Batch Seal</h1>
            <p className="text-sm text-muted-foreground">
              Seal multiple doses at once
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Coffee Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Coffee & Roast Date</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label>Coffee</Label>
                <Select value={coffeeId} onValueChange={setCoffeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coffee" />
                  </SelectTrigger>
                  <SelectContent>
                    {coffees?.filter((c: { archived: boolean }) => !c.archived).map((c: { id: string; coffeeName: string; roaster: string }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.coffeeName} ({c.roaster})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Roast Date</Label>
                <Input
                  type="date"
                  value={roastDate}
                  onChange={(e) => setRoastDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dose Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4" />
                Select Doses
              </CardTitle>
              <CardDescription>
                {emptyVials.length} empty dose(s) available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(vialsByDoseType).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No empty doses available. Create new doses first.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(vialsByDoseType).map(([doseTypeId, vials]) => {
                    const doseType = doseTypes?.find((dt: { id: string }) => dt.id === doseTypeId);
                    const vialsArray = vials as { id: string; vialCode: string; doseTypeId: string }[];
                    const allSelected = vialsArray.every((v) => selectedVials.includes(v.id));
                    
                    return (
                      <div key={doseTypeId} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => selectAllOfType(doseTypeId)}
                            />
                            <span className="font-medium text-sm">{doseType?.name || "Unknown"}</span>
                            <Badge variant="outline" className="text-xs">
                              {doseType?.gramsPerDose}g
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {vialsArray.filter((v) => selectedVials.includes(v.id)).length}/{vialsArray.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vialsArray.map((vial) => (
                            <div
                              key={vial.id}
                              onClick={() => toggleVial(vial.id)}
                              className={`
                                px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors
                                ${selectedVials.includes(vial.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary/50 border-border hover:border-primary/50"
                                }
                              `}
                            >
                              {vial.vialCode}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary & Confirm */}
          {selectedVials.length > 0 && (
            <Card className="border-primary/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">Selected</span>
                  <Badge>{selectedVials.length} dose(s)</Badge>
                </div>
                <Button
                  onClick={handleBatchSeal}
                  disabled={loading || !coffeeId || !roastDate}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Sealing..." : `Seal ${selectedVials.length} Dose(s)`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
