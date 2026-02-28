"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useHomeData } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Package, Coffee, ChevronRight, Sparkles, Leaf, Snowflake, Zap, ThumbsUp, Turtle, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { mutate } from "swr";

// Strict time windows for greeting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 23) return "Good evening";
  return "Late night brew?";
}

function getRelativeTime(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
}

function getFreshnessLabel(days: number, isFrozen?: boolean) {
  if (isFrozen) return { label: "Frozen", color: "bg-blue-100 text-blue-700 border-blue-200" };
  if (days < 7) return { label: "Resting", color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (days <= 21) return { label: "At peak", color: "bg-green-100 text-green-700 border-green-200" };
  if (days <= 35) return { label: "Fading", color: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "Stale", color: "bg-red-100 text-red-700 border-red-200" };
}

// Feedback icon component
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

// Dynamic subtitle based on priority
function DynamicSubtitle({ peakCount, frozenCount, lastBrewTime }: { 
  peakCount: number; 
  frozenCount: number; 
  lastBrewTime: string | null;
}) {
  if (peakCount > 0) {
    return <span>You have {peakCount} dose{peakCount !== 1 ? 's' : ''} at peak</span>;
  }
  if (frozenCount > 0) {
    return <span>Your frozen coffee is ready</span>;
  }
  if (lastBrewTime) {
    return <span>Last brew: {getRelativeTime(lastBrewTime)}</span>;
  }
  return <span>Ready to brew?</span>;
}

export default function HomePage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data, isLoading: homeLoading, mutate: mutateHome } = useHomeData(currentCellar?.id);
  
  // Combined loading: cellar loading OR (we have cellar but home data still loading)
  const isLoading = cellarLoading || (currentCellar?.id && homeLoading);

  const handleFreezeAll = async () => {
    if (!data?.staleSoonDoseIds?.length || !currentCellar?.id) return;
    
    setIsFreezing(true);
    try {
      const res = await fetch("/api/dose/freezeMany", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doseIds: data.staleSoonDoseIds,
          cellarId: currentCellar.id,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to freeze doses");
      }
      
      const result = await res.json();
      toast.success(`Froze ${result.frozenCount} dose${result.frozenCount !== 1 ? 's' : ''}`);
      
      // Refresh home data
      mutateHome();
      const cellarParam = `?cellarId=${currentCellar.id}`;
      mutate(`/api/inventory${cellarParam}`);
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to freeze doses");
    } finally {
      setIsFreezing(false);
      setShowFreezeConfirm(false);
    }
  };

  const handleScan = useCallback(
    async (value: string) => {
      try {
        const res = await fetch(
          `/api/vials/lookup?qr=${encodeURIComponent(value)}`
        );
        const vial = await res.json();
        if (vial) {
          router.push(`/vials/${vial.id}`);
        } else {
          toast.error("Dose not found", {
            description: "This QR code doesn't match any known dose.",
          });
          setShowScanner(false);
        }
      } catch {
        toast.error("Error scanning QR code");
        setShowScanner(false);
      }
    },
    [router]
  );

  if (showScanner) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      </div>
    );
  }

  const greeting = getGreeting();
  const isLateNight = greeting === "Late night brew?";

  // Compute the actual SWR key being used
  const swrKey = currentCellar?.id ? `/api/home?cellarId=${currentCellar.id}` : null;
  
  return (
  <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
  {/* DEV DEBUG PANEL - Remove after debugging */}
  {process.env.NODE_ENV !== "production" && (
    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-xs font-mono">
      <div className="font-bold text-yellow-800 mb-1">DEBUG (Home Page)</div>
      <div>cellar.id: <span className="text-blue-600">{currentCellar?.id || "NULL"}</span></div>
      <div>cellar.name: <span className="text-blue-600">{currentCellar?.name || "NULL"}</span></div>
      <div>cellarLoading: <span className="text-blue-600">{String(cellarLoading)}</span></div>
      <div>SWR key: <span className="text-blue-600">{swrKey || "NULL"}</span></div>
      <div>homeLoading: <span className="text-blue-600">{String(homeLoading)}</span></div>
    </div>
  )}
  {/* Header with time-aware greeting */}
  <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLateNight ? (
            "Easy... just one more."
          ) : isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <DynamicSubtitle 
              peakCount={data?.peakDoseCount || 0}
              frozenCount={data?.frozenDoseCount || 0}
              lastBrewTime={data?.lastBrew?.timestamp || null}
            />
          )}
        </p>
      </header>

      {/* Hero Section - Brew Recommendations (up to 2 cards) */}
      <section className="mb-6" aria-label="Brew recommendations">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : data?.heroRecommendations && data.heroRecommendations.length > 0 ? (
          <div className="space-y-3">
            {data.heroRecommendations.map((hero: {
              vialId: string;
              vialCode: string;
              coffeeName: string;
              roaster: string;
              originCountry: string | null;
              color: string | null;
              doseTypeName: string;
              method: string;
              gramsPerDose: number;
              daysSinceRoast: number;
              isFrozen: boolean;
            }) => {
              const freshness = getFreshnessLabel(hero.daysSinceRoast, hero.isFrozen);
              return (
                <Card key={hero.vialId} className="overflow-hidden border-2 shadow-sm">
                  <CardContent className="p-5">
                    {/* Coffee name and roaster */}
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      {hero.coffeeName}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      {hero.roaster} · {hero.method === 'espresso' ? 'Espresso' : 'Filter'} · {hero.gramsPerDose}g
                    </p>

                    {/* Status badges */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={freshness.color}>
                        {freshness.label}
                      </Badge>
                      {hero.isFrozen && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          <Snowflake className="size-3 mr-1" />
                          Frozen
                        </Badge>
                      )}
                    </div>

                    {/* Dose ID - critical for shelf matching */}
                    <p className="text-sm text-muted-foreground mb-4">
                      Dose: <span className="font-mono font-bold text-foreground">{hero.vialCode}</span>
                    </p>

                    <Link href={`/vials/${hero.vialId}?brew=true`}>
                      <Button className="w-full h-12 text-base font-semibold gap-2">
                        <Sparkles className="size-4" />
                        Brew this dose
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="p-6 text-center">
              <div className="size-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <Leaf className="size-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">
                No sealed doses
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Seal one to get started
              </p>
              <Link href="/seal">
                <Button variant="outline" size="sm">
                  Seal a dose
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Freeze Reminder - About to go stale warning */}
      {!isLoading && data?.staleSoonCount > 0 && (
        <section className="mb-6" aria-label="Freeze reminder">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground mb-1">
                    {data.staleSoonCount} dose{data.staleSoonCount !== 1 ? 's' : ''} will go stale soon
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Freeze to pause freshness
                  </p>
                  <div className="flex gap-2">
                    <Link href="/inventory?filter=fading">
                      <Button variant="outline" size="sm">
                        View doses
                      </Button>
                    </Link>
                    <Button 
                      size="sm"
                      onClick={() => setShowFreezeConfirm(true)}
                      disabled={isFreezing}
                    >
                      <Snowflake className="size-3 mr-1" />
                      Freeze all
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Last Brew - Memory, not action */}
      {!isLoading && data?.lastBrew && (
        <section className="mb-6" aria-label="Last brew">
          <Link href="/history" className="block">
            <div className="bg-muted/50 rounded-lg px-4 py-3 hover:bg-muted/70 transition-colors">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Last brew
              </p>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {data.lastBrew.coffeeName} · {data.lastBrew.brewMethod === 'espresso' ? 'Espresso' : 'Filter'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Grind {data.lastBrew.grindSize} · Yield {data.lastBrew.extractionGrams}g · {getRelativeTime(data.lastBrew.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <FeedbackIcon feedback={data.lastBrew.brewFeedback} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Frozen Reminder - Contextual only */}
      {!isLoading && data?.frozenDoses && data.frozenDoses.length > 0 && (
        <section className="mb-6" aria-label="Frozen doses">
          <div className="space-y-2">
            {data.frozenDoses.slice(0, 2).map((dose: {
              vialId: string;
              vialCode: string;
              coffeeName: string;
              roaster: string;
              gramsPerDose: number;
            }) => (
              <Link 
                key={dose.vialId}
                href={`/vials/${dose.vialId}`}
                className="block"
              >
                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-blue-50/70 border border-blue-100 hover:bg-blue-100/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Snowflake className="size-5 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {dose.coffeeName} · {dose.vialCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tap to thaw or brew
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-blue-400 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats - Glance only, two tiles */}
      {!isLoading && (data?.weekStats?.cups > 0 || data?.monthStats?.cups > 0) && (
        <section className="mb-6" aria-label="Brew stats">
          <Link href="/history" className="block">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-4 text-center hover:bg-muted/70 transition-colors">
                <p className="text-2xl font-bold text-foreground">{data.weekStats?.cups || 0}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center hover:bg-muted/70 transition-colors">
                <p className="text-2xl font-bold text-foreground">{data.monthStats?.cups || 0}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Bottom Actions - Clean, minimal */}
      <section aria-label="Quick actions">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2"
            onClick={() => setShowScanner(true)}
          >
            <QrCode className="size-4" />
            Scan dose
          </Button>
          <Link href="/inventory" className="flex-1">
            <Button variant="outline" className="w-full h-12 gap-2">
              <Package className="size-4" />
              Go to Inventory
            </Button>
          </Link>
        </div>
      </section>

      {/* Freeze All Confirmation Dialog */}
      <AlertDialog open={showFreezeConfirm} onOpenChange={setShowFreezeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freeze {data?.staleSoonCount} dose{data?.staleSoonCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              These doses are about to go stale. Freezing will pause freshness so you can enjoy them later.
              {data?.staleSoonGroups && data.staleSoonGroups.length > 0 && (
                <span className="block mt-2 text-xs">
                  Doses: {data.staleSoonGroups.map((g: { vialCodes: string[] }) => g.vialCodes.join(", ")).join(", ")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFreezing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFreezeAll}
              disabled={isFreezing}
            >
              {isFreezing ? "Freezing..." : "Freeze all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
