"use client";

import Link from "next/link";
import { useInventory } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export function InventorySummary() {
  const { data, isLoading, error } = useInventory();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Could not load inventory. Check your Firebase connection.
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
              Create vials and fill them with coffee to see your inventory here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((group) => (
        <Link
          key={`${group.coffeeId}__${group.doseTypeId}`}
          href={`/inventory?coffee=${group.coffeeId}&dose=${group.doseTypeId}`}
        >
          <Card className="transition-colors hover:bg-secondary/50">
            <CardContent className="flex items-center justify-between py-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {group.coffeeName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.roaster} &middot; {group.doseTypeName} (
                  {group.gramsPerDose}g)
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary font-bold text-base px-3 py-1"
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
