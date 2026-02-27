"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";
import { useHomeData } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Plus, Coffee, ChevronRight, Sparkles, Clock } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return "just now";
  if (diffHours < 24) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getFreshnessLabel(days: number): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (days < 7) return { label: "Resting", variant: "secondary" };
  if (days <= 21) return { label: "Peak", variant: "default" };
  if (days <= 35) return { label: "Fading", variant: "outline" };
  return { label: "Stale", variant: "destructive" };
}

function getColorClass(color: string | null): string {
  if (!color) return "";
  const colors: Record<string, string> = {
    amber: "border-l-amber-500",
    orange: "border-l-orange-500",
    red: "border-l-red-500",
    pink: "border-l-pink-500",
    purple: "border-l-purple-500",
    blue: "border-l-blue-500",
    teal: "border-l-teal-500",
    green: "border-l-green-500",
  };
  return colors[color] || "";
}

export default function HomePage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const { data, isLoading } = useHomeData();

  const handleScan = useCallback(
    async (value: string) => {
      try {
        const res = await fetch(`/api/vials/lookup?qr=${encodeURIComponent(value)}`);
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

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Greeting Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {getGreeting()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ready to brew?
        </p>
      </header>

      {/* A) Last Brew Context */}
      {!isLoading && data?.lastBrew && (
        <section className="mb-6" aria-label="Last brew">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-muted">
              <Clock className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Last brew</p>
              <p className="text-sm font-medium text-foreground truncate">
                {data.lastBrew.coffeeName}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.lastBrew.brewMethod} &middot; {getRelativeTime(data.lastBrew.timestamp)}
              </p>
              {data.lastBrew.notes && (
                <p className="text-xs text-muted-foreground/80 mt-1 italic truncate">
                  "{data.lastBrew.notes}"
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* B) Primary Brew Card */}
      <section className="mb-6" aria-label="Suggested brew">
        {isLoading ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ) : data?.suggested ? (
          <Card className={`overflow-hidden border-l-4 ${getColorClass(data.suggested.color) || "border-l-primary"}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your next brew</p>
                  <h2 className="text-xl font-bold text-foreground leading-tight">
                    {data.suggested.coffeeName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {data.suggested.roaster}
                  </p>
                </div>
                <Badge variant={getFreshnessLabel(data.suggested.daysSinceRoast).variant}>
                  {getFreshnessLabel(data.suggested.daysSinceRoast).label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                <span className="font-mono">{data.suggested.gramsPerDose}g</span>
                <span>&middot;</span>
                <span>{data.suggested.doseTypeName}</span>
                <span>&middot;</span>
                <span className="font-mono text-xs">{data.suggested.vialCode}</span>
              </div>

              <Link href={`/vials/${data.suggested.vialId}`}>
                <Button size="lg" className="w-full text-base font-semibold h-12">
                  <Coffee className="size-5 mr-2" />
                  Brew my dose
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-dashed">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Coffee className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No sealed doses
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Seal a dose to get started
              </p>
              <Link href="/vials/create">
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-1.5" />
                  Create dose
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* C) Secondary Actions */}
      <section className="mb-6" aria-label="Quick actions">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 justify-start px-4"
            onClick={() => setShowScanner(true)}
          >
            <QrCode className="size-4 mr-2 text-muted-foreground" />
            <span className="text-sm">Scan dose</span>
          </Button>
          <Link href="/batch-seal" className="contents">
            <Button variant="outline" className="h-12 justify-start px-4">
              <Plus className="size-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Seal doses</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* E) Go-To Coffee */}
      {!isLoading && data?.goTo && (
        <section className="mb-6" aria-label="Go-to coffee">
          <Link href={`/coffees/${data.goTo.coffeeId}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Your go-to lately</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {data.goTo.coffeeName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Brewed {data.goTo.brewCount} times this month
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        </section>
      )}

      {/* D) Inventory Snapshot */}
      {!isLoading && data?.inventory && data.inventory.length > 0 && (
        <section className="mb-6" aria-label="Inventory snapshot">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              In your cellar
            </h2>
            <Link href="/inventory" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {data.inventory.map((item: { coffeeId: string; coffeeName: string; roaster: string; color: string | null; doseTypeName: string; count: number }) => (
              <Link key={`${item.coffeeId}-${item.doseTypeName}`} href={`/coffees/${item.coffeeId}`}>
                <div className={`flex items-center justify-between p-3 rounded-lg bg-card border hover:bg-muted/50 transition-colors ${item.color ? `border-l-4 ${getColorClass(item.color)}` : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.coffeeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.doseTypeName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {item.count}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* F) Freshness Hint */}
      {!isLoading && data?.peakFreshnessCount > 0 && (
        <section aria-label="Freshness hint">
          <p className="text-center text-xs text-muted-foreground">
            {data.peakFreshnessCount === 1
              ? "1 coffee is at peak freshness today"
              : `${data.peakFreshnessCount} coffees are at peak freshness today`}
          </p>
        </section>
      )}
    </div>
  );
}
