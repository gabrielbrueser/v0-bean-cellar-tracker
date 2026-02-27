"use client";

import { useActivity } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Coffee, Clock, Beaker } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  timestamp: string;
  brewMethod: string;
  notes: string;
  gramsPerDose: number;
  roastDate: string;
  vialCode: string;
  coffeeName: string;
  roaster: string;
  doseTypeName: string;
}

export default function SettingsPage() {
  const { data: activities, isLoading } = useActivity();

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          View your coffee history and activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" />
            Activity History
          </CardTitle>
          <CardDescription>
            Recent coffee usage and brewing activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Coffee className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Use a vial to see your history here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(activities as Activity[]).map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Beaker className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {activity.coffeeName}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {activity.gramsPerDose}g
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.roaster} &middot; {activity.vialCode}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                      {activity.brewMethod && (
                        <Badge variant="outline" className="text-xs">
                          {activity.brewMethod}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
          <CardDescription>Your coffee consumption summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {activities?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Cups brewed</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {activities
                  ? (
                      activities.reduce(
                        (sum: number, a: Activity) => sum + (a.gramsPerDose || 0),
                        0
                      ) / 1000
                    ).toFixed(1)
                  : 0}
                kg
              </p>
              <p className="text-xs text-muted-foreground">Coffee used</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
