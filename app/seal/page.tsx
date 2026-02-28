"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import { useCoffees, useDoseTypes, useAllVials } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  ArrowRight, 
  Coffee, 
  Search, 
  Plus, 
  CheckCircle2, 
  Package,
  Beaker
} from "lucide-react";

type Step = "coffee" | "doseType" | "selectDoses" | "confirm";

interface DoseType {
  id: string;
  name: string;
  gramsPerDose: number;
  prefix: string;
}

interface CoffeeItem {
  id: string;
  coffeeName: string;
  roaster: string;
  originCountry?: string;
  archived: boolean;
  lastRoastDate?: string;
  lastBrewed?: string;
  totalBrews?: number;
}

interface EmptyDose {
  id: string;
  vialCode: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  status: string;
}

export default function SealCoffeePage() {
  const router = useRouter();
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data: coffees, isLoading: coffeesLoading } = useCoffees(currentCellar?.id);
  const { data: doseTypes, isLoading: doseTypesLoading } = useDoseTypes();
  const { data: allVials, isLoading: vialsLoading } = useAllVials("EMPTY");
  
  // Combined loading for coffee list
  const isCoffeeListLoading = cellarLoading || (currentCellar?.id && coffeesLoading);

  // Flow state
  const [step, setStep] = useState<Step>("coffee");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);
  const [selectedDoseTypeId, setSelectedDoseTypeId] = useState<string | null>(null);
  const [selectedDoseIds, setSelectedDoseIds] = useState<string[]>([]);
  const [roastDate, setRoastDate] = useState("");
  const [isSealing, setIsSealing] = useState(false);
  const [sealedCount, setSealedCount] = useState(0);
  const [failedIds, setFailedIds] = useState<string[]>([]);

  // Derived data
  const activeCoffees = useMemo(() => 
    coffees?.filter((c: CoffeeItem) => !c.archived) || [],
    [coffees]
  );

  const filteredCoffees = useMemo(() => {
    if (!searchQuery.trim()) return activeCoffees;
    const q = searchQuery.toLowerCase();
    return activeCoffees.filter((c: CoffeeItem) => 
      c.coffeeName.toLowerCase().includes(q) || 
      c.roaster.toLowerCase().includes(q)
    );
  }, [activeCoffees, searchQuery]);

  const selectedCoffee = useMemo(() => 
    coffees?.find((c: CoffeeItem) => c.id === selectedCoffeeId),
    [coffees, selectedCoffeeId]
  );

  const selectedDoseType = useMemo(() => 
    doseTypes?.find((dt: DoseType) => dt.id === selectedDoseTypeId),
    [doseTypes, selectedDoseTypeId]
  );

  // Empty doses filtered by selected dose type
  const emptyDosesForType = useMemo(() => {
    if (!selectedDoseTypeId || !allVials) return [];
    return allVials.filter((v: EmptyDose) => 
      v.status === "EMPTY" && v.doseTypeId === selectedDoseTypeId
    );
  }, [allVials, selectedDoseTypeId]);

  const toggleDose = (doseId: string) => {
    setSelectedDoseIds(prev => 
      prev.includes(doseId) 
        ? prev.filter(id => id !== doseId)
        : [...prev, doseId]
    );
  };

  const selectAll = () => {
    const allIds = emptyDosesForType.map((d: EmptyDose) => d.id);
    const allSelected = allIds.every((id: string) => selectedDoseIds.includes(id));
    if (allSelected) {
      setSelectedDoseIds([]);
    } else {
      setSelectedDoseIds(allIds);
    }
  };

  const handleSeal = async () => {
    if (!selectedCoffeeId || !roastDate || selectedDoseIds.length === 0) {
      toast.error("Please complete all fields");
      return;
    }

    setIsSealing(true);
    let successCount = 0;
    const failed: string[] = [];

    for (const doseId of selectedDoseIds) {
      const dose = emptyDosesForType.find((d: EmptyDose) => d.id === doseId);
      if (!dose) continue;

      try {
        const res = await fetch(`/api/vials/${doseId}/fill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coffeeId: selectedCoffeeId,
            doseTypeId: dose.doseTypeId,
            roastDate,
            gramsPerDose: dose.gramsPerDose,
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failed.push(dose.vialCode);
        }
      } catch {
        failed.push(dose.vialCode);
      }
    }

    setSealedCount(successCount);
    setFailedIds(failed);

    // Refresh data (cellar-scoped)
    const cellarParam = currentCellar?.id ? `?cellarId=${currentCellar.id}` : "";
    mutate(`/api/inventory${cellarParam}`);
    mutate("/api/vials/all");
    mutate("/api/vials");
    mutate(`/api/home${cellarParam}`);
    mutate(`/api/coffees${cellarParam}`);

    if (failed.length > 0) {
      toast.error(`Failed to seal: ${failed.join(", ")}`);
    }

    setStep("confirm");
    setIsSealing(false);
  };

  const resetFlow = () => {
    setStep("coffee");
    setSearchQuery("");
    setSelectedCoffeeId(null);
    setSelectedDoseTypeId(null);
    setSelectedDoseIds([]);
    setRoastDate("");
    setSealedCount(0);
    setFailedIds([]);
  };

  // Loading state
  if (isCoffeeListLoading || doseTypesLoading || vialsLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Step: Confirmation / Success
  if (step === "confirm") {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Doses Sealed!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {sealedCount} dose{sealedCount !== 1 ? "s" : ""} sealed with {selectedCoffee?.coffeeName}
              </p>
              {failedIds.length > 0 && (
                <p className="text-sm text-destructive mt-2">
                  Failed: {failedIds.join(", ")}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Link href="/inventory">
                <Button>View Inventory</Button>
              </Link>
              <Button variant="outline" onClick={resetFlow}>
                Seal More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "coffee" ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (step === "doseType") setStep("coffee");
              else if (step === "selectDoses") setStep("doseType");
            }}
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : (
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">Seal Coffee</h1>
          <p className="text-sm text-muted-foreground">
            {step === "coffee" && "Step 1: Choose coffee"}
            {step === "doseType" && "Step 2: Select dose type"}
            {step === "selectDoses" && "Step 3: Select doses"}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {["coffee", "doseType", "selectDoses"].map((s, i) => (
          <div 
            key={s}
            className={`h-1 flex-1 rounded-full ${
              step === s || ["coffee", "doseType", "selectDoses"].indexOf(step) > i
                ? "bg-primary" 
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Choose Coffee */}
      {step === "coffee" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search coffees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Coffee list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredCoffees.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Coffee className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No coffees match your search" : "No coffees yet"}
                  </p>
                  <Link href="/coffees/create">
                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                      <Plus className="size-3" />
                      Add Coffee
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              filteredCoffees.map((coffee: CoffeeItem) => {
                const formatDate = (dateStr?: string) => {
                  if (!dateStr) return null;
                  const date = new Date(dateStr);
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                };
                
                return (
                  <Card 
                    key={coffee.id}
                    className={`cursor-pointer transition-all ${
                      selectedCoffeeId === coffee.id 
                        ? "ring-2 ring-primary border-primary" 
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedCoffeeId(coffee.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Coffee className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {coffee.coffeeName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {coffee.roaster}{coffee.originCountry ? ` · ${coffee.originCountry}` : ""}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                            {coffee.lastRoastDate && (
                              <p>Roasted: {formatDate(coffee.lastRoastDate)}</p>
                            )}
                            {coffee.lastBrewed && (
                              <p>Last brewed: {formatDate(coffee.lastBrewed)}</p>
                            )}
                          </div>
                        </div>
                        {selectedCoffeeId === coffee.id && (
                          <CheckCircle2 className="size-5 text-primary shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Manage coffees link */}
          <div className="flex gap-2">
            <Link href="/coffees/create" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Plus className="size-4" />
                Add Coffee
              </Button>
            </Link>
            <Link href="/coffees" className="flex-1">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Manage coffees
              </Button>
            </Link>
          </div>

          {/* Next button */}
          {selectedCoffeeId && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setStep("doseType")}
            >
              Continue
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Step 2: Select Dose Type */}
      {step === "doseType" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sealing: <span className="font-semibold text-foreground">{selectedCoffee?.coffeeName}</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            {doseTypes?.map((dt: DoseType) => {
              const emptyCount = allVials?.filter(
                (v: EmptyDose) => v.status === "EMPTY" && v.doseTypeId === dt.id
              ).length || 0;

              return (
                <Card 
                  key={dt.id}
                  className={`cursor-pointer transition-all ${
                    selectedDoseTypeId === dt.id 
                      ? "ring-2 ring-primary border-primary" 
                      : emptyCount === 0 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:border-primary/50"
                  }`}
                  onClick={() => {
                    if (emptyCount > 0) {
                      setSelectedDoseTypeId(dt.id);
                      setSelectedDoseIds([]);
                    }
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Beaker className="size-6 text-primary" />
                    </div>
                    <p className="font-bold text-foreground text-lg">{dt.name}</p>
                    <p className="text-sm text-muted-foreground">{dt.gramsPerDose}g per dose</p>
                    <Badge variant="outline" className="mt-2">
                      {emptyCount} empty
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedDoseTypeId && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setStep("selectDoses")}
            >
              Continue
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Step 3: Select Doses */}
      {step === "selectDoses" && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <p className="text-sm">
                <span className="font-semibold">{selectedCoffee?.coffeeName}</span>
                {" · "}
                <span className="text-muted-foreground">{selectedDoseType?.name} ({selectedDoseType?.gramsPerDose}g)</span>
              </p>
            </CardContent>
          </Card>

          {/* Roast Date */}
          <div className="space-y-2">
            <Label htmlFor="roastDate">Roast Date (required)</Label>
            <Input
              id="roastDate"
              type="date"
              value={roastDate}
              onChange={(e) => setRoastDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Dose Selection */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="size-4" />
                  Select Doses
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {emptyDosesForType.every((d: EmptyDose) => selectedDoseIds.includes(d.id)) 
                    ? "Deselect All" 
                    : "Select All"
                  }
                </Button>
              </div>
              <CardDescription>
                Available empty {selectedDoseType?.prefix} doses: {emptyDosesForType.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emptyDosesForType.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No empty doses available. Create doses in Settings first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {emptyDosesForType.map((dose: EmptyDose) => (
                    <div
                      key={dose.id}
                      onClick={() => toggleDose(dose.id)}
                      className={`
                        px-3 py-2 rounded-lg border text-sm font-mono cursor-pointer transition-all
                        ${selectedDoseIds.includes(dose.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 border-border hover:border-primary/50"
                        }
                      `}
                    >
                      {dose.vialCode}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirm Button */}
          {selectedDoseIds.length > 0 && roastDate && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Selected</span>
                  <Badge variant="default">{selectedDoseIds.length} dose{selectedDoseIds.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3 font-mono">
                  {selectedDoseIds.map(id => 
                    emptyDosesForType.find((d: EmptyDose) => d.id === id)?.vialCode
                  ).join(" · ")}
                </div>
                <Button
                  onClick={handleSeal}
                  disabled={isSealing}
                  className="w-full"
                  size="lg"
                >
                  {isSealing ? "Sealing..." : `Seal ${selectedDoseIds.length} Dose${selectedDoseIds.length !== 1 ? "s" : ""}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
