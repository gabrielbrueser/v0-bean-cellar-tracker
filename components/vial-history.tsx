"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useCoffee } from "@/lib/hooks";
import type { FillSession } from "@/lib/types";

function HistoryItem({ session }: { session: FillSession }) {
  const { data: coffee } = useCoffee(session.coffeeId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {coffee?.coffeeName ?? "Loading..."}
        </p>
        <p className="text-xs text-muted-foreground">
          {coffee?.roaster} &middot; Roasted{" "}
          {format(new Date(session.roastDate), "MMM d, yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          Filled {format(session.filledAt, "MMM d, yyyy")}
        </p>
      </div>
      <Badge
        variant={
          session.status === "FULL"
            ? "default"
            : session.status === "USED"
            ? "secondary"
            : "outline"
        }
        className="text-xs"
      >
        {session.status}
      </Badge>
    </div>
  );
}

export function VialHistory({ sessions }: { sessions: FillSession[] }) {
  return (
    <div className="flex flex-col gap-2">
      {sessions.map((s) => (
        <HistoryItem key={s.id} session={s} />
      ))}
    </div>
  );
}
