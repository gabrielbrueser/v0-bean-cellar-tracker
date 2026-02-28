"use client";

import { format } from "date-fns";
import { useCoffee } from "@/lib/hooks";
import type { FillSession } from "@/lib/types";
import { Package, Coffee as CoffeeIcon, Snowflake, Sun } from "lucide-react";

interface LifecycleEvent {
  type: "sealed" | "frozen" | "thawed" | "brewed";
  date: Date;
  label: string;
  icon: typeof Package;
  color: string;
}

function LifecycleTimeline({ session }: { session: FillSession }) {
  const { data: coffee } = useCoffee(session.coffeeId);
  
  // Build lifecycle events
  const events: LifecycleEvent[] = [];
  
  // Sealed event
  events.push({
    type: "sealed",
    date: new Date(session.filledAt),
    label: `Sealed with ${coffee?.coffeeName ?? "coffee"}`,
    icon: Package,
    color: "text-primary bg-primary/10",
  });
  
  // Note: frozen/thawed events would come from a separate events table
  // For now, we show the current state if frozen
  
  // Brewed event (if used)
  if (session.status === "USED" && session.usedAt) {
    events.push({
      type: "brewed",
      date: new Date(session.usedAt),
      label: "Brewed",
      icon: CoffeeIcon,
      color: "text-amber-600 bg-amber-50",
    });
  }
  
  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />
      
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
          <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
            {/* Timeline dot */}
            <div className={`absolute left-[-15px] size-5 rounded-full flex items-center justify-center ${event.color}`}>
              <Icon className="size-3" />
            </div>
            
            {/* Event content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">
                {event.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(event.date, "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryItem({ session }: { session: FillSession }) {
  const { data: coffee } = useCoffee(session.coffeeId);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {coffee?.coffeeName ?? "Loading..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {coffee?.roaster} · Roasted {format(new Date(session.roastDate), "MMM d, yyyy")}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          session.status === "FULL" 
            ? "bg-green-100 text-green-700" 
            : "bg-muted text-muted-foreground"
        }`}>
          {session.status === "FULL" ? "Sealed" : "Brewed"}
        </span>
      </div>
      
      <LifecycleTimeline session={session} />
    </div>
  );
}

export function VialHistory({ sessions }: { sessions: FillSession[] }) {
  return (
    <div className="flex flex-col gap-3">
      {sessions.map((s) => (
        <HistoryItem key={s.id} session={s} />
      ))}
    </div>
  );
}
