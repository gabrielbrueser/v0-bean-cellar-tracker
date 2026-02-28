"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Snowflake, 
  Sparkles, 
  Timer, 
  AlertTriangle,
  Coffee,
  ChevronRight
} from "lucide-react";
import { useCellarContext } from "@/lib/cellar-context";

interface Dose {
  id: string;
  vialCode: string;
  doseTypeId: string;
  isFrozen: boolean;
  frozenAt: string | null;
  sealedAt: string;
}

interface InventoryGroup {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  isFrozen: boolean;
  roastDate: string | null;
  count: number;
  doses: Dose[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getFreshnessInfo(roastDate: string | null) {
  if (!roastDate) {
    return {
      label: "Fresh",
      color: "bg-green-100 text-green-700 border-green-200",
      icon: Sparkles,
    };
  }

  const days = differenceInDays(new Date(), new Date(roastDate));
  
  if (days < 7) {
    return { 
      label: "Resting", 
      color: "bg-amber-100 text-amber-700 border-amber-200", 
      icon: Timer,
    };
  } else if (days <= 21) {
    return { 
      label: "Peak", 
      color: "bg-green-100 text-green-700 border-green-200", 
      icon: Sparkles,
    };
  } else if (days <= 35) {
    return { 
      label: "Fading", 
      color: "bg-orange-100 text-orange-700 border-orange-200", 
      icon: AlertTriangle,
    };
  } else {
    return { 
      label: "Stale", 
      color: "bg-red-100 text-red-700 border-red-200", 
      icon: AlertTriangle,
    };
  }
}

function sortDosesByCode(doses: Dose[]): Dose[] {
  return [...doses].sort((a, b) => {
    const numA = parseInt(a.vialCode.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.vialCode.replace(/[^0-9]/g, "")) || 0;
    return numA - numB;
  });
}

function GroupDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupKey = searchParams.get("key");
  const { currentCellar } = useCellarContext();
  
  // Cellar-scoped inventory URL
  const inventoryUrl = currentCellar?.id ? `/api/inventory?cellarId=${currentCellar.id}` : null;
  
  const { data: groups, isLoading } = useSWR<InventoryGroup[]>(inventoryUrl, fetcher);
  const [isBrewDialogOpen, setIsBrewDialogOpen] = useState(false);
  const [isFreezeLoading, setIsFreezeLoading] = useState(false);

  // Parse group key: coffeeId|doseTypeId|state
  const [coffeeId, doseTypeId, state] = groupKey?.split("|") || [];
  const isFrozen = state === "frozen";

  // Find matching group
  const group = groups?.find(
    (g) =>
      g.coffeeId === coffeeId &&
      g.doseTypeId === doseTypeId &&
      g.isFrozen === isFrozen
  );

  // Select best dose for brewing (FIFO)
  const selectBestDose = (g: InventoryGroup) => g.doses[0];

  const handleConfirmBrew = () => {
    if (!group || group.doses.length === 0) return;
    const bestDose = selectBestDose(group);
    router.push(`/vials/${bestDose.id}?brew=true`);
    setIsBrewDialogOpen(false);
  };

  const handleFreezeToggle = async () => {
    if (!group) return;
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setIsFreezeLoading(true);
    const action = group.isFrozen ? "unfreeze" : "freeze";
    let successCount = 0;
    let failCount = 0;
    const cellarParam = `cellarId=${currentCellar.id}`;

    for (const dose of group.doses) {
      try {
        const res = await fetch(`/api/vials/${dose.id}/freeze?${cellarParam}`, {
          method: "POST",
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} dose${successCount !== 1 ? "s" : ""} ${action === "freeze" ? "frozen" : "unfrozen"}`);
      mutate(inventoryUrl);
      mutate(`/api/home?${cellarParam}`);
      // After toggling, go back to inventory since group state changed
      router.push("/inventory");
    }
    if (failCount > 0) {
      toast.error(`Failed to ${action} ${failCount} dose${failCount !== 1 ? "s" : ""}`);
    }

    setIsFreezeLoading(false);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <header className="mb-6">
          <Link href="/inventory">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="size-4" />
              Back to Inventory
            </Button>
          </Link>
        </header>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Group not found</p>
            <Link href="/inventory">
              <Button className="mt-4">Back to Inventory</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const freshness = getFreshnessInfo(group.roastDate);
  const FreshnessIcon = freshness.icon;
  const sortedDoses = sortDosesByCode(group.doses);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Back button */}
      <header className="mb-4">
        <Link href="/inventory">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="size-4" />
            Back to Inventory
          </Button>
        </Link>
      </header>

      {/* Group Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
          {group.coffeeName}
        </h1>
        <p className="text-sm text-muted-foreground mb-3">
          {group.roaster} · {group.doseTypeName} · {group.gramsPerDose}g
        </p>
        
        {/* Status badges */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className={freshness.color}>
            <FreshnessIcon className="size-3 mr-1" />
            {freshness.label}
          </Badge>
          {group.isFrozen && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
              <Snowflake className="size-3 mr-1" />
              Frozen
            </Badge>
          )}
        </div>

        {/* Big count */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{group.count}</span>
          <span className="text-lg text-muted-foreground">dose{group.count !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <Button 
          className="flex-1"
          onClick={() => setIsBrewDialogOpen(true)}
        >
          <Coffee className="size-4 mr-2" />
          Brew
        </Button>
        <Button
          variant="outline"
          className={`flex-1 ${group.isFrozen ? "text-blue-600 border-blue-200" : ""}`}
          onClick={handleFreezeToggle}
          disabled={isFreezeLoading}
        >
          <Snowflake className="size-4 mr-2" />
          {isFreezeLoading ? "..." : group.isFrozen ? "Unfreeze All" : "Freeze All"}
        </Button>
      </div>

      {/* Dose List */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          All Doses in This Group
        </h2>
        <div className="flex flex-col gap-2">
          {sortedDoses.map((dose) => (
            <Link key={dose.id} href={`/vials/${dose.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-foreground">
                      {dose.vialCode}
                    </span>
                    {dose.isFrozen && (
                      <Snowflake className="size-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Sealed {format(new Date(dose.sealedAt), "MMM d, yyyy")}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Brew Confirmation Dialog */}
      <Dialog open={isBrewDialogOpen} onOpenChange={setIsBrewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Brew a Dose</DialogTitle>
            <DialogDescription>
              Brewing <strong>{group.coffeeName}</strong> from{" "}
              <strong>{group.roaster}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Selected dose:</p>
              <p className="text-2xl font-bold font-mono text-primary">
                {selectBestDose(group).vialCode}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Grab this dose from your shelf
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBrewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBrew}>
              <Coffee className="size-4 mr-2" />
              Continue to Brew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GroupDetailsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <GroupDetailsContent />
    </Suspense>
  );
}
