"use client";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Beaker, Coffee, Zap, ThumbsUp, Turtle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrewLog } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function FeedbackBadge({ feedback }: { feedback: string }) {
  const config = {
    fast: { icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Too fast" },
    good: { icon: ThumbsUp, color: "text-green-600 bg-green-50 border-green-200", label: "Just right" },
    slow: { icon: Turtle, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Too slow" },
  }[feedback] || { icon: Coffee, color: "", label: feedback };
  
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      <Icon className="size-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export default function BrewHistoryPage() {
  const { data: brewLogs, isLoading } = useSWR<BrewLog[]>("/api/brew?limit=50", fetcher);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Brew History
        </h1>
        <p className="text-sm text-muted-foreground">
          Your recent brews and dial-in data
        </p>
      </header>

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
        <div className="flex flex-col gap-3">
          {brewLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Beaker className="size-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground truncate">
                        {log.coffeeName}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0 font-mono">
                        {log.vialCode}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {log.roaster}
                      {log.userName && ` · brewed by ${log.userName}`}
                    </p>

                    {/* Brew details */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-lg font-bold text-foreground">{log.doseGrams}g</p>
                        <p className="text-xs text-muted-foreground">Dose</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-lg font-bold text-foreground">{log.grindSize}</p>
                        <p className="text-xs text-muted-foreground">Grind</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-lg font-bold text-foreground">{log.extractionGrams}g</p>
                        <p className="text-xs text-muted-foreground">Yield</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {log.brewMethod}
                      </Badge>
                      <FeedbackBadge feedback={log.brewFeedback} />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
