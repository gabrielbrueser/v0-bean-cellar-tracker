"use client";

import { use, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useCoffee, useProcessMethods, useCoffeeTimeline } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CoffeeForm } from "@/components/coffee-form";
import { CoffeePhotoGallery } from "@/components/coffee-photo-gallery";
import { ArrowLeft, Edit, ExternalLink, Clock, ChevronDown, Coffee as CoffeeIcon, Droplets, Plus } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { toast } from "sonner";
import { mutate } from "swr";

export default function CoffeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { currentCellar } = useCellarContext();
  const cellarId = currentCellar?.id;
  const cellarParam = cellarId ? `?cellarId=${cellarId}` : "";
  
  const { data: coffee, isLoading, mutate } = useCoffee(id, cellarId);
  const { data: processMethods } = useProcessMethods();
  const { data: timeline } = useCoffeeTimeline(id, cellarId);
  const [showEdit, setShowEdit] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const processName =
    processMethods?.find((pm) => pm.id === coffee?.processMethodId)?.name ?? "";

  const handleRatingChange = async (newRating: number) => {
    if (!coffee || !cellarId) return;
    try {
      await fetch(`/api/coffees/${id}${cellarParam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...coffee, score: newRating }),
      });
      mutate(`/api/coffees/${id}${cellarParam}`);
      mutate(`/api/coffees${cellarParam}`);
      toast.success(`Rated ${newRating} stars`);
    } catch {
      toast.error("Failed to update rating");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!coffee) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">Coffee not found</p>
        <Link href="/coffees">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/coffees">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-bold text-foreground truncate">
          {coffee.coffeeName}
        </h1>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setShowEdit(true)}
        >
          <Edit className="size-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{coffee.coffeeName}</CardTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Your rating:</span>
            <StarRating
              value={coffee.score || 0}
              onChange={handleRatingChange}
              size="md"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Brew Stats Summary */}
          {timeline?.stats?.totalBrews > 0 && (
            <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CoffeeIcon className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold text-foreground">{timeline.stats.totalBrews}</p>
                  <p className="text-xs text-muted-foreground">brews</p>
                </div>
              </div>
              {timeline.stats.lastBrewed && (
                <div className="flex items-center gap-2 border-l border-border pl-4">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDistanceToNow(new Date(timeline.stats.lastBrewed), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">last brewed</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grind Size Stats */}
          {timeline?.grindStats?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {timeline.grindStats.map((gs: { brewMethod: string; avgGrind: number | null; count: number }) => (
                <Badge key={gs.brewMethod} variant="outline" className="text-xs">
                  {gs.brewMethod}: avg grind {gs.avgGrind ?? "N/A"} ({gs.count} brews)
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Roaster</span>
              <p className="font-medium text-foreground">{coffee.roaster}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Origin</span>
              <p className="font-medium text-foreground">{coffee.origin}</p>
            </div>
            {coffee.producer && (
              <div>
                <span className="text-muted-foreground text-xs">Producer</span>
                <p className="font-medium text-foreground">{coffee.producer}</p>
              </div>
            )}
            {coffee.variety && (
              <div>
                <span className="text-muted-foreground text-xs">Variety</span>
                <p className="font-medium text-foreground">{coffee.variety}</p>
              </div>
            )}
            {coffee.altitude && (
              <div>
                <span className="text-muted-foreground text-xs">Altitude</span>
                <p className="font-medium text-foreground">{coffee.altitude}</p>
              </div>
            )}
            {processName && (
              <div>
                <span className="text-muted-foreground text-xs">Process</span>
                <p className="font-medium text-foreground">{processName}</p>
              </div>
            )}
          </div>

          {coffee.tastingNotes && (
            <div className="border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                Tasting Notes
              </span>
              <p className="text-sm text-foreground">{coffee.tastingNotes}</p>
            </div>
          )}

          {coffee.notes && (
            <div>
              <span className="text-xs text-muted-foreground">Notes</span>
              <p className="text-sm text-foreground">{coffee.notes}</p>
            </div>
          )}

          {coffee.link && (
            <a
              href={coffee.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              View online
            </a>
          )}

          {/* Brew Timeline */}
          {timeline?.brews?.length > 0 && (
            <div className="border-t border-border pt-4 mt-2">
              <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <span className="text-sm font-semibold text-foreground">Brew History</span>
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform ${showTimeline ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {timeline.brews.map((brew: { 
                      id: string; 
                      timestamp: string; 
                      brewMethod: string; 
                      grindSize: number | null; 
                      vialCode: string;
                      gramsPerDose: number;
                    }) => (
                      <div key={brew.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg text-sm">
                        <Droplets className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground capitalize">{brew.brewMethod}</span>
                            {brew.grindSize && (
                              <Badge variant="outline" className="text-xs">grind {brew.grindSize}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(brew.timestamp), "MMM d, yyyy 'at' h:mm a")} • {brew.vialCode} • {brew.gramsPerDose}g
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Photo Gallery */}
          <div className="border-t border-border pt-4 mt-2">
            <CoffeePhotoGallery coffeeId={id} />
          </div>
        </CardContent>
      </Card>

      {/* Seal Dose Shortcut */}
      <Link href={`/seal?coffee=${id}`} className="block mt-4">
        <Button variant="outline" className="w-full h-12 gap-2">
          <Plus className="size-4" />
          Seal dose with this coffee
        </Button>
      </Link>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coffee</DialogTitle>
            <DialogDescription>
              Update the details for this coffee.
            </DialogDescription>
          </DialogHeader>
          <CoffeeForm
            coffee={coffee}
            onSave={() => {
              setShowEdit(false);
              mutate();
            }}
            onCancel={() => setShowEdit(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
