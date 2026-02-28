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

type FilterType = "all" | "sealed" | "frozen";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Returns freshness badge info - NEVER returns Frozen (that's handled separately)
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

// Sort dose codes by their numeric suffix (ESP-001, ESP-002, etc.)
function sortDosesByCode(doses: Dose[]): Dose[] {
  return [...doses].sort((a, b) => {
    const numA = parseInt(a.vialCode.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.vialCode.replace(/[^0-9]/g, "")) || 0;
    return numA - numB;
  });
}

// Generate group key for routing
function getGroupKey(group: InventoryGroup): string {
  return encodeURIComponent(
    `${group.coffeeId}|${group.doseTypeId}|${group.isFrozen ? "frozen" : "sealed"}`
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const [filter, setFilter] = useState<FilterType>("all");
  // Use null key when no cellarId - SWR won't fetch until cellarId is available
  const inventoryUrl = currentCellar?.id ? `/api/inventory?cellarId=${currentCellar.id}` : null;
  const { data: groups, isLoading: inventoryLoading } = useSWR<InventoryGroup[]>(inventoryUrl, fetcher);
  
  // Combined loading: cellar loading OR (we have cellar but inventory still loading)
  const isLoading = cellarLoading || (currentCellar?.id && inventoryLoading);
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

  // Select the best dose for brewing (FIFO - already sorted by sealedAt ASC from API)
  const selectBestDose = (group: InventoryGroup) => {
    return group.doses[0];
  };

  const handleConfirmBrew = () => {
    if (!selectedGroup || selectedGroup.doses.length === 0) return;
    const bestDose = selectBestDose(selectedGroup);
    router.push(`/vials/${bestDose.id}?brew=true`);
    setIsBrewDialogOpen(false);
  };

  // Navigate to appropriate detail page based on group size
  const handleViewDetails = (group: InventoryGroup) => {
    if (group.doses.length === 1) {
      // Single dose: go directly to dose detail
      router.push(`/vials/${group.doses[0].id}`);
    } else {
      // Multiple doses: go to group details page
      router.push(`/inventory/group?key=${getGroupKey(group)}`);
    }
  };

  const handleFreezeToggle = async (group: InventoryGroup) => {
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
    }
    if (failCount > 0) {
      toast.error(`Failed to ${action} ${failCount} dose${failCount !== 1 ? "s" : ""}`);
    }

    setIsFreezeLoading(false);
  };

  // Render status badges - single source of truth
  const renderStatusBadges = (group: InventoryGroup) => {
    const freshness = getFreshnessInfo(group.roastDate);
    const FreshnessIcon = freshness.icon;
    
    return (
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {/* Freshness badge - always shown */}
        <Badge variant="outline" className={freshness.color}>
          <FreshnessIcon className="size-3 mr-1" />
          {freshness.label}
        </Badge>
        {/* Frozen badge - only if frozen */}
        {group.isFrozen && (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
            <Snowflake className="size-3 mr-1" />
            Frozen
          </Badge>
        )}
      </div>
    );
  };

  return (
  <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
  {/* DEV DEBUG PANEL - Remove after debugging */}
  {process.env.NODE_ENV !== "production" && (
    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-xs font-mono">
      <div className="font-bold text-yellow-800 mb-1">DEBUG (Inventory Page)</div>
      <div>cellar.id: <span className="text-blue-600">{currentCellar?.id || "NULL"}</span></div>
      <div>cellar.name: <span className="text-blue-600">{currentCellar?.name || "NULL"}</span></div>
      <div>cellarLoading: <span className="text-blue-600">{String(cellarLoading)}</span></div>
      <div>SWR key: <span className="text-blue-600">{inventoryUrl || "NULL"}</span></div>
      <div>groups.length: <span className="text-blue-600">{groups?.length ?? "undefined"}</span></div>
      <div>inventoryLoading: <span className="text-blue-600">{String(inventoryLoading)}</span></div>
    </div>
  )}
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
            const sortedDoses = sortDosesByCode(group.doses);
            
            return (
              <Card 
                key={`${group.coffeeId}-${group.doseTypeId}-${group.isFrozen}-${idx}`} 
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleViewDetails(group)}
              >
                <CardContent className="p-4">
                  {/* Header row: Coffee name + status badges */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-foreground truncate">
                        {group.coffeeName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.roaster} · {group.doseTypeName} · {group.gramsPerDose}g
                      </p>
                    </div>
                    {renderStatusBadges(group)}
                  </div>

                  {/* Big count */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold text-foreground">{group.count}</span>
                    <span className="text-sm text-muted-foreground">dose{group.count !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Dose ID Chips - clickable, sorted ascending, wrap */}
                  <div 
                    className="flex flex-wrap gap-1.5 mb-4" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sortedDoses.map((dose) => (
                      <Link key={dose.id} href={`/vials/${dose.id}`}>
                        <button
                          className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 text-xs font-mono font-medium rounded-full border border-border bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        >
                          {dose.vialCode}
                        </button>
                      </Link>
                    ))}
                  </div>

                  {/* Actions - stop propagation to prevent card click */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      className="flex-1"
                      onClick={() => handleBrewClick(group)}
                    >
                      <Coffee className="size-4 mr-2" />
                      Brew
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleViewDetails(group)}
                    >
                      View details
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
                  {selectBestDose(selectedGroup).vialCode}
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
