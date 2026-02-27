"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useHomeData } from "@/lib/hooks";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Plus, Coffee, ChevronRight, Sparkles, Leaf } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getRelativeTime(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function getFreshnessLabel(days: number) {
  if (days < 7) return { label: "Resting", color: "bg-amber-500/15 text-amber-700" };
  if (days <= 21) return { label: "Peak", color: "bg-green-500/15 text-green-700" };
  if (days <= 35) return { label: "Fading", color: "bg-orange-500/15 text-orange-700" };
  return { label: "Stale", color: "bg-red-500/15 text-red-700" };
}

function getColorClass(color: string | null) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    pink: "bg-pink-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    teal: "bg-teal-500",
    green: "bg-green-500",
  };
  return color ? colors[color] : null;
}

export default function HomePage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const { data, isLoading } = useHomeData();

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

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      {/* Greeting */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ready to brew?
        </p>
      </header>

      {/* Last Brew Context */}
      {!isLoading && data?.lastBrew && (
        <section className="mb-6" aria-label="Last brew">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last brew
            </span>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {data.lastBrew.coffeeName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.lastBrew.brewMethod} · {getRelativeTime(data.lastBrew.timestamp)}
                </p>
              </div>
            </div>
            {data.lastBrew.notes && (
              <p className="mt-1.5 text-xs text-muted-foreground italic truncate">
                "{data.lastBrew.notes}"
              </p>
            )}
          </div>
        </section>
      )}

      {/* Primary Brew Card */}
      <section className="mb-6" aria-label="Suggested brew">
        {isLoading ? (
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ) : data?.suggested ? (
          <Card className="overflow-hidden border-2 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {getColorClass(data.suggested.color) && (
                  <span className={`size-2.5 rounded-full ${getColorClass(data.suggested.color)}`} />
                )}
                <Badge 
                  variant="secondary" 
                  className={`text-xs font-medium ${getFreshnessLabel(data.suggested.daysSinceRoast).color}`}
                >
                  {getFreshnessLabel(data.suggested.daysSinceRoast).label}
                </Badge>
              </div>
              
              <h2 className="text-xl font-bold text-foreground mb-1">
                {data.suggested.coffeeName}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {data.suggested.roaster} · {data.suggested.gramsPerDose}g {data.suggested.doseTypeName}
              </p>

              <Link href={`/vials/${data.suggested.vialId}`}>
                <Button className="w-full h-12 text-base font-semibold gap-2">
                  <Sparkles className="size-4" />
                  Brew my dose
                </Button>
              </Link>
            </CardContent>
          </Card>
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
              <Link href="/batch-seal">
                <Button variant="outline" size="sm">
                  Seal a dose
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Secondary Actions */}
      <section className="mb-6" aria-label="Quick actions">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2"
            onClick={() => setShowScanner(true)}
          >
            <QrCode className="size-4" />
            Scan dose
          </Button>
          <Link href="/vials/create" className="flex-1">
            <Button variant="outline" className="w-full h-11 gap-2">
              <Plus className="size-4" />
              New dose
            </Button>
          </Link>
        </div>
      </section>

      {/* Inventory Snapshot */}
      {!isLoading && data?.inventory && data.inventory.length > 0 && (
        <section className="mb-6" aria-label="Inventory">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">
              On hand
            </h3>
            <Link 
              href="/inventory" 
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              View all
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.inventory.map((item: {
              coffeeId: string;
              coffeeName: string;
              roaster: string;
              color: string | null;
              doseTypeName: string;
              count: number;
            }) => (
              <Link 
                key={`${item.coffeeId}-${item.doseTypeName}`}
                href={`/coffees/${item.coffeeId}`}
                className="block"
              >
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getColorClass(item.color) && (
                      <span className={`size-2 rounded-full shrink-0 ${getColorClass(item.color)}`} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.coffeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.doseTypeName}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {item.count} {item.count === 1 ? "dose" : "doses"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Go-To Coffee */}
      {!isLoading && data?.goTo && (
        <section className="mb-6" aria-label="Your favorite">
          <Link href={`/coffees/${data.goTo.coffeeId}`}>
            <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  Your go-to lately
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {data.goTo.coffeeName}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {data.goTo.brewCount}x this month
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Freshness Hint */}
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
