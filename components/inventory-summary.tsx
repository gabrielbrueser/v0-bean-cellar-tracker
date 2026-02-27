"use client";

import Link from "next/link";
import { useInventory } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

interface InventoryGroup {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  count: number;
  vials?: Array<{ id: string; vialCode: string }>;
  firstVialCode?: string;
}

export function InventorySummary() {
  const { data, isLoading, error } = useInventory();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Could not load inventory. Check your database connection.
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <Package className="size-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              No inventory yet
            </p>
            <p className="text-xs text-muted-foreground">
              Create doses and seal them with coffee to see your inventory here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(data as InventoryGroup[]).map((group) => (
        <Link
          key={`${group.coffeeId}__${group.doseTypeId}`}
          href={`/inventory?coffee=${group.coffeeId}&dose=${group.doseTypeId}`}
        >
          <Card className="transition-colors hover:bg-secondary/50">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                {/* Big title: Coffee name */}
                <span className="text-base font-bold text-foreground truncate">
                  {group.coffeeName}
                </span>
                {/* Secondary: Roaster + Dose type */}
                <span className="text-sm text-muted-foreground">
                  {group.roaster} &middot; {group.doseTypeName} ({group.gramsPerDose}g)
                </span>
                {/* Small line: Vial codes */}
                <span className="text-xs text-muted-foreground/70 font-mono">
                  {group.count === 1 && group.firstVialCode
                    ? group.firstVialCode
                    : group.firstVialCode
                    ? `${group.firstVialCode} + ${group.count - 1} more`
                    : `${group.count} doses`}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary font-bold text-lg px-3 py-1 shrink-0"
              >
                {group.count}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
