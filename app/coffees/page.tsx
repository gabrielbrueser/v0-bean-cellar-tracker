"use client";

import { useState } from "react";
import Link from "next/link";
import { useCoffees, useProcessMethods } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CoffeeForm } from "@/components/coffee-form";
import { StarRating } from "@/components/star-rating";
import { Coffee, Plus, MoreVertical, Archive, ArchiveRestore, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";

// Color mapping for coffee tags
const COLOR_CLASSES: Record<string, string> = {
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  green: "bg-green-500",
};

export default function CoffeesPage() {
  const { data: coffees, isLoading, mutate: mutateCoffees } = useCoffees();
  const { data: processMethods } = useProcessMethods();
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const getProcessName = (id: string) =>
    processMethods?.find((pm) => pm.id === id)?.name ?? "";

  const activeCoffees = coffees?.filter((c: { archived: boolean }) => !c.archived) || [];
  const archivedCoffees = coffees?.filter((c: { archived: boolean }) => c.archived) || [];

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await fetch(`/api/coffees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archive }),
      });
      mutateCoffees();
      toast.success(archive ? "Coffee archived" : "Coffee restored");
    } catch {
      toast.error("Failed to update coffee");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
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
          {/* Active Coffees */}
          {activeCoffees.map((c: {
            id: string;
            coffeeName: string;
            roaster: string;
            origin: string;
            processMethodId: string;
            tastingNotes: string;
            color: string | null;
            score: number;
          }) => (
            <Card key={c.id} className="transition-colors hover:bg-secondary/50 group">
              <CardContent className="flex items-start gap-3 py-0 relative">
                {/* Color indicator */}
                {c.color && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${COLOR_CLASSES[c.color] || ""}`} />
                )}
                <Link href={`/coffees/${c.id}`} className="flex-1 min-w-0 py-3">
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
                </Link>
                <div className="shrink-0 flex items-center gap-2 py-3">
                  <StarRating value={c.score || 0} readonly size="sm" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleArchive(c.id, true)}>
                        <Archive className="size-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Archived Coffees */}
          {archivedCoffees.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Archive className="size-4" />
                    Archived ({archivedCoffees.length})
                  </span>
                  <ChevronDown className={`size-4 transition-transform ${showArchived ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {archivedCoffees.map((c: {
                  id: string;
                  coffeeName: string;
                  roaster: string;
                  origin: string;
                  score: number;
                }) => (
                  <Card key={c.id} className="transition-colors hover:bg-secondary/50 opacity-60 group">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Link href={`/coffees/${c.id}`} className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.coffeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.roaster} &middot; {c.origin}
                        </p>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(c.id, false)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                      >
                        <ArchiveRestore className="size-4" />
                        Restore
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
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
              mutateCoffees();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
