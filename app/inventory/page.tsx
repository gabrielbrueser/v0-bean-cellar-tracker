"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import useSWR from "swr";
import { differenceInDays } from "date-fns";
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
  Package, 
  Layers, 
  Filter, 
  Snowflake, 
  Sparkles, 
  Timer, 
  AlertTriangle,
  Coffee
} from "lucide-react";

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

type FilterType = "all" | "sealed" | "frozen";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getFreshnessInfo(roastDate: string | null, isFrozen: boolean) {
  if (isFrozen) {
    return {
      label: "Frozen",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: Snowflake,
    };
  }
  
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

export default function InventoryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const { data: groups, isLoading } = useSWR<InventoryGroup[]>("/api/inventory", fetcher);
  const [selectedGroup, setSelectedGroup] = useState<InventoryGroup | null>(null);
  const [isBrewDialogOpen, setIsBrewDialogOpen] = useState(false);
  const [isFreezeLoading, setIsFreezeLoading] = useState(false);

  // Filter groups
  const filteredGroups = groups?.filter((g) => {
    if (filter === "frozen") return g.isFrozen;
    if (filter === "sealed") return !g.isFrozen;
    return true;
  }) || [];

  // Count totals
  const totalSealed = groups?.filter(g => !g.isFrozen).reduce((sum, g) => sum + g.count, 0) || 0;
  const totalFrozen = groups?.filter(g => g.isFrozen).reduce((sum, g) => sum + g.count, 0) || 0;

  const handleBrewClick = (group: InventoryGroup) => {
    setSelectedGroup(group);
    setIsBrewDialogOpen(true);
  };

  const handleConfirmBrew = () => {
    if (!selectedGroup || selectedGroup.doses.length === 0) return;
    
    // Pick the oldest sealed dose (first in the sorted array)
    const oldestDose = selectedGroup.doses[0];
    
    // Navigate to vial detail page to complete the brew
    router.push(`/vials/${oldestDose.id}?brew=true`);
    setIsBrewDialogOpen(false);
  };

  const handleFreezeToggle = async (group: InventoryGroup) => {
    setIsFreezeLoading(true);
    const action = group.isFrozen ? "unfreeze" : "freeze";
    let successCount = 0;
    let failCount = 0;

    for (const dose of group.doses) {
      try {
        const res = await fetch(`/api/vials/${dose.id}/freeze`, {
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
      mutate("/api/inventory");
      mutate("/api/home");
    }
    if (failCount > 0) {
      toast.error(`Failed to ${action} ${failCount} dose${failCount !== 1 ? "s" : ""}`);
    }

    setIsFreezeLoading(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Header */}
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalSealed + totalFrozen} sealed dose{totalSealed + totalFrozen !== 1 ? "s" : ""} ready
          </p>
        </div>
        <Link href="/seal">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Layers className="size-3.5" />
            Seal Doses
          </Button>
        </Link>
      </header>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex rounded-lg border border-border p-1 bg-secondary/30">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "sealed" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("sealed")}
          >
            Sealed ({totalSealed})
          </Button>
          <Button
            variant={filter === "frozen" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("frozen")}
          >
            Frozen ({totalFrozen})
          </Button>
        </div>
      </div>

      {/* Inventory Groups */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Package className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No sealed doses
              </p>
              <p className="text-xs text-muted-foreground">
                {filter !== "all" 
                  ? "Try changing the filter"
                  : "Seal some coffee to get started"
                }
              </p>
            </div>
            <Link href="/seal">
              <Button size="sm">Seal Coffee</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredGroups.map((group, idx) => {
            const freshness = getFreshnessInfo(group.roastDate, group.isFrozen);
            const FreshnessIcon = freshness.icon;
            
            return (
              <Card key={`${group.coffeeId}-${group.doseTypeId}-${group.isFrozen}-${idx}`} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header row: Coffee name + freshness badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground truncate">
                        {group.coffeeName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.roaster} · {group.doseTypeName} · {group.gramsPerDose}g
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`shrink-0 ml-2 ${freshness.color}`}
                    >
                      <FreshnessIcon className="size-3 mr-1" />
                      {freshness.label}
                    </Badge>
                  </div>

                  {/* Big count */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-foreground">{group.count}</span>
                    <span className="text-sm text-muted-foreground">dose{group.count !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Dose IDs */}
                  <p className="text-xs text-muted-foreground font-mono mb-4">
                    {group.doses.map(d => d.vialCode).join(" · ")}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleBrewClick(group)}
                    >
                      <Coffee className="size-4 mr-2" />
                      Brew my dose
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleFreezeToggle(group)}
                      disabled={isFreezeLoading}
                      className={group.isFrozen ? "text-blue-600 border-blue-200 hover:bg-blue-50" : ""}
                    >
                      <Snowflake className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Brew Confirmation Dialog */}
      <Dialog open={isBrewDialogOpen} onOpenChange={setIsBrewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Brew a Dose</DialogTitle>
            <DialogDescription>
              {selectedGroup && (
                <>
                  Brewing <strong>{selectedGroup.coffeeName}</strong> from{" "}
                  <strong>{selectedGroup.roaster}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && selectedGroup.doses.length > 0 && (
            <div className="py-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Selected dose:</p>
                <p className="text-2xl font-bold font-mono text-primary">
                  {selectedGroup.doses[0].vialCode}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grab this dose from your shelf
                </p>
              </div>
            </div>
          )}

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
