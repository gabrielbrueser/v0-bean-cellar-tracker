"use client";

import Link from "next/link";
import { useInventory, useDoseTypes } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronRight } from "lucide-react";

export default function InventoryPage() {
  const { data, isLoading } = useInventory();
  const { data: doseTypes } = useDoseTypes();

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          All filled vials grouped by coffee and dose type
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Package className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No filled vials
              </p>
              <p className="text-xs text-muted-foreground">
                Create vials and fill them to see your inventory.
              </p>
            </div>
            <Link href="/vials/create">
              <Button size="sm">Create a Vial</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((group) => (
            <Card key={`${group.coffeeId}__${group.doseTypeId}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{group.coffeeName}</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary font-bold"
                  >
                    {group.count} vial{group.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.roaster} &middot; {group.doseTypeName} (
                  {group.gramsPerDose}g)
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5">
                  {group.vials.map((vial) => (
                    <Link
                      key={vial.id}
                      href={`/vials/${vial.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50"
                    >
                      <span className="text-sm font-mono text-foreground">
                        {vial.vialCode}
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
