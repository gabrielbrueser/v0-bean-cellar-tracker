"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Zap, ThumbsUp, Turtle, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrewLog } from "@/lib/types";
import { useBrewLogs, useBrewStats } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { mutate } from "swr";

function FeedbackIcon({ feedback }: { feedback: string }) {
  const config = {
    fast: { icon: Zap, color: "text-amber-600" },
    good: { icon: ThumbsUp, color: "text-green-600" },
    slow: { icon: Turtle, color: "text-blue-600" },
  }[feedback];
  
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={`size-4 ${config.color}`} />;
}

interface GroupedBrews {
  [monthYear: string]: BrewLog[];
}

export default function HistoryPage() {
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data: brewLogs, isLoading: brewsLoading, mutate: mutateBrewLogs } = useBrewLogs(currentCellar?.id, 100);
  const { data: stats, mutate: mutateStats } = useBrewStats(currentCellar?.id);
  
  // Combined loading: cellar loading OR (we have cellar but brews still loading)
  const isLoading = cellarLoading || (currentCellar?.id && brewsLoading);
  
  const [brewToDelete, setBrewToDelete] = useState<BrewLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group brews by month
  const groupedBrews = useMemo(() => {
    if (!brewLogs) return {} as GroupedBrews;
    
    const groups: GroupedBrews = {};
    brewLogs.forEach((log) => {
      const date = parseISO(log.createdAt as unknown as string);
      const monthYear = format(date, "MMMM yyyy");
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(log);
    });
    return groups;
  }, [brewLogs]);

  const monthKeys = Object.keys(groupedBrews);

  const handleDeleteBrew = async () => {
    if (!brewToDelete || !currentCellar?.id) return;
    
    setIsDeleting(true);
    
    // Optimistic UI update - remove from local state immediately
    const previousBrews = brewLogs;
    mutateBrewLogs(
      brewLogs?.filter((b) => b.id !== brewToDelete.id),
      false
    );
    
    try {
      const res = await fetch(`/api/brew/${brewToDelete.id}?cellarId=${currentCellar.id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete brew");
      }
      
      toast.success("Brew deleted");
      
      // Revalidate stats to recompute totals
      mutateStats();
      
      // Also refresh home data
      const cellarParam = currentCellar.id ? `?cellarId=${currentCellar.id}` : "";
      mutate(`/api/home${cellarParam}`);
      mutate(`/api/coffees${cellarParam}`);
      
    } catch (err) {
      // Rollback on error
      mutateBrewLogs(previousBrews, false);
      toast.error(err instanceof Error ? err.message : "Failed to delete brew");
    } finally {
      setIsDeleting(false);
      setBrewToDelete(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          History
        </h1>
        <p className="text-sm text-muted-foreground">
          Your brews & dial-in data
        </p>
      </header>

      {/* Stats Block */}
      {!isLoading && (
        <section className="mb-6" aria-label="Brew statistics">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.weekCups ?? 0}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.monthCups ?? 0}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.allTimeCups ?? brewLogs?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
              <span>{stats?.weekGrams ?? 0}g this week</span>
              <span>·</span>
              <span>{stats?.monthGrams ?? 0}g this month</span>
            </div>
          </div>
        </section>
      )}

      {/* Brew List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !brewLogs || brewLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Clock className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No brews yet
              </p>
              <p className="text-xs text-muted-foreground">
                Brew a dose to see your history here
              </p>
            </div>
            <Link href="/inventory">
              <Button size="sm">Go to Inventory</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {monthKeys.map((monthYear) => (
            <section key={monthYear}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                {monthYear}
              </h2>
              <div className="space-y-2">
                {groupedBrews[monthYear].map((log) => (
                  <Card key={log.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">
                            {log.coffeeName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.brewMethod === 'espresso' ? 'Espresso' : 'Filter'} · {log.doseGrams}g
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <FeedbackIcon feedback={log.brewFeedback} />
                          {log.vialCode && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {log.vialCode}
                            </Badge>
                          )}
                          {/* Overflow Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="size-7">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">More options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setBrewToDelete(log)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Brew metrics */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>Grind: <span className="font-medium text-foreground">{log.grindSize}</span></span>
                        <span>Yield: <span className="font-medium text-foreground">{log.extractionGrams}g</span></span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(log.createdAt as unknown as string), { addSuffix: true })}
                      </p>

                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">
                          "{log.notes}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!brewToDelete} onOpenChange={() => setBrewToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brew?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the brew log for{" "}
              <span className="font-medium">{brewToDelete?.coffeeName}</span> from your history.
              Statistics will be recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBrew}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
