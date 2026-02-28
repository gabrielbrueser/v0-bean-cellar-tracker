"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCoffees, useProcessMethods, useDoseTypes } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CoffeeForm } from "@/components/coffee-form";
import { StarRating } from "@/components/star-rating";
import { Coffee, Plus, MoreVertical, Archive, ArchiveRestore, ChevronDown, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useCellarContext } from "@/lib/cellar-context";

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

interface CoffeeItem {
  id: string;
  coffeeName: string;
  roaster: string;
  origin: string;
  originCountry?: string;
  processMethodId: string;
  tastingNotes: string;
  color: string | null;
  score: number;
  archived: boolean;
  lastBrewed?: string;
  totalBrews?: number;
  lastRoastDate?: string;
}

export default function CoffeesPage() {
  const { currentCellar } = useCellarContext();
  const { data: coffees, isLoading, mutate: mutateCoffees } = useCoffees(currentCellar?.id);
  const { data: processMethods } = useProcessMethods();
  const { data: doseTypes } = useDoseTypes();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [filterRoaster, setFilterRoaster] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string | null>(null);

  const getProcessName = (id: string) =>
    processMethods?.find((pm) => pm.id === id)?.name ?? "";

  // Get unique filter options
  const filterOptions = useMemo(() => {
    if (!coffees) return { roasters: [], origins: [], methods: [] };
    const activeCoffees = coffees.filter((c: CoffeeItem) => !c.archived);
    return {
      roasters: [...new Set(activeCoffees.map((c: CoffeeItem) => c.roaster))].filter(Boolean).sort(),
      origins: [...new Set(activeCoffees.map((c: CoffeeItem) => c.originCountry || c.origin))].filter(Boolean).sort(),
      methods: doseTypes?.map((dt: { id: string; name: string }) => ({ id: dt.id, name: dt.name })) || [],
    };
  }, [coffees, doseTypes]);

  // Filter coffees
  const filteredCoffees = useMemo(() => {
    if (!coffees) return [];
    let result = coffees.filter((c: CoffeeItem) => !c.archived);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: CoffeeItem) => 
        c.coffeeName.toLowerCase().includes(q) || 
        c.roaster.toLowerCase().includes(q) ||
        c.origin?.toLowerCase().includes(q)
      );
    }
    
    if (filterRoaster) {
      result = result.filter((c: CoffeeItem) => c.roaster === filterRoaster);
    }
    
    if (filterOrigin) {
      result = result.filter((c: CoffeeItem) => 
        (c.originCountry || c.origin) === filterOrigin
      );
    }
    
    return result;
  }, [coffees, searchQuery, filterRoaster, filterOrigin]);

  const archivedCoffees = coffees?.filter((c: CoffeeItem) => c.archived) || [];
  
  const hasActiveFilters = filterRoaster || filterOrigin || filterMethod;
  
  const clearFilters = () => {
    setFilterRoaster(null);
    setFilterOrigin(null);
    setFilterMethod(null);
    setSearchQuery("");
  };

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

      {/* Search and Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search coffees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Roaster Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={filterRoaster ? "secondary" : "outline"} 
                size="sm" 
                className="gap-1"
              >
                <Filter className="size-3" />
                {filterRoaster || "Roaster"}
                {filterRoaster && <X className="size-3 ml-1" onClick={(e) => { e.stopPropagation(); setFilterRoaster(null); }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Roaster</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.roasters.map((roaster) => (
                <DropdownMenuItem 
                  key={roaster as string}
                  onClick={() => setFilterRoaster(roaster as string)}
                >
                  {roaster as string}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Origin Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={filterOrigin ? "secondary" : "outline"} 
                size="sm" 
                className="gap-1"
              >
                <Filter className="size-3" />
                {filterOrigin || "Origin"}
                {filterOrigin && <X className="size-3 ml-1" onClick={(e) => { e.stopPropagation(); setFilterOrigin(null); }} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Origin</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.origins.map((origin) => (
                <DropdownMenuItem 
                  key={origin as string}
                  onClick={() => setFilterOrigin(origin as string)}
                >
                  {origin as string}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>
      </div>

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
      ) : filteredCoffees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Coffee className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No coffees match your filters
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Active Coffees */}
          {filteredCoffees.map((c: CoffeeItem) => (
            <Card key={c.id} className="transition-colors hover:bg-secondary/50 group">
              <CardContent className="flex items-start gap-3 py-0 relative">
                {/* Color indicator */}
                {c.color && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${COLOR_CLASSES[c.color] || ""}`} />
                )}
                <Link href={`/coffees/${c.id}`} className="flex-1 min-w-0 py-3 pl-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {c.coffeeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.roaster} · {c.originCountry || c.origin}
                  </p>
                  
                  {/* Brew stats */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {c.totalBrews !== undefined && c.totalBrews > 0 && (
                      <span>
                        Total brews: <span className="font-medium text-foreground">{c.totalBrews}</span>
                      </span>
                    )}
                    {c.lastBrewed && (
                      <span>
                        Last brewed: <span className="font-medium text-foreground">
                          {formatDistanceToNow(new Date(c.lastBrewed), { addSuffix: true })}
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {c.tastingNotes && (
                    <p className="mt-1.5 truncate text-xs text-muted-foreground italic">
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
                {archivedCoffees.map((c: CoffeeItem) => (
                  <Card key={c.id} className="transition-colors hover:bg-secondary/50 opacity-60 group">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Link href={`/coffees/${c.id}`} className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.coffeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.roaster} · {c.originCountry || c.origin}
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
