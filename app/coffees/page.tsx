"use client";

import { useState } from "react";
import Link from "next/link";
import { useCoffees, useProcessMethods } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CoffeeForm } from "@/components/coffee-form";
import { Coffee, Plus, Star } from "lucide-react";

export default function CoffeesPage() {
  const { data: coffees, isLoading, mutate } = useCoffees();
  const { data: processMethods } = useProcessMethods();
  const [showCreate, setShowCreate] = useState(false);

  const getProcessName = (id: string) =>
    processMethods?.find((pm) => pm.id === id)?.name ?? "";

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Coffees
          </h1>
          <p className="text-sm text-muted-foreground">
            Your coffee collection
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="size-3.5" />
          Add
        </Button>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !coffees || coffees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Coffee className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No coffees yet
              </p>
              <p className="text-xs text-muted-foreground">
                Add your first coffee to get started.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Add Coffee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {coffees.map((c) => (
            <Link key={c.id} href={`/coffees/${c.id}`}>
              <Card className="transition-colors hover:bg-secondary/50">
                <CardContent className="flex items-start gap-3 py-0">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.coffeeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.roaster} &middot; {c.origin}
                    </p>
                    {c.processMethodId && (
                      <p className="text-xs text-muted-foreground">
                        {getProcessName(c.processMethodId)}
                      </p>
                    )}
                    {c.tastingNotes && (
                      <p className="mt-1 truncate text-xs text-muted-foreground italic">
                        {c.tastingNotes}
                      </p>
                    )}
                  </div>
                  {c.score > 0 && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 text-xs shrink-0"
                    >
                      <Star className="size-3 fill-current" />
                      {c.score}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Coffee</DialogTitle>
            <DialogDescription>
              Enter the details for a new coffee.
            </DialogDescription>
          </DialogHeader>
          <CoffeeForm
            onSave={() => {
              setShowCreate(false);
              mutate();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
