"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDoseTypes } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Beaker, Save } from "lucide-react";

export default function SettingsPage() {
  const { data: doseTypes, isLoading } = useDoseTypes();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const getDisplayValue = (dt: { id: string; gramsPerDose: number }) => {
    if (values[dt.id] !== undefined) {
      return values[dt.id];
    }
    return String(dt.gramsPerDose);
  };

  const handleSave = async (id: string) => {
    const newValue = values[id];
    if (newValue === undefined) return;

    const grams = parseFloat(newValue);
    if (isNaN(grams) || grams <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    setSaving(id);
    try {
      const res = await fetch("/api/dose-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, gramsPerDose: grams }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      // Clear local edit state and refresh data
      setValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      mutate("dose-types");
      toast.success("Dose type updated");
    } catch {
      toast.error("Failed to update dose type");
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (dt: { id: string; gramsPerDose: number }) => {
    const editedValue = values[dt.id];
    if (editedValue === undefined) return false;
    return parseFloat(editedValue) !== dt.gramsPerDose;
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize your Bean Cellar Tracker preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dose Types</CardTitle>
          <CardDescription>
            Set the grammage (weight in grams) for each dose type
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            doseTypes?.map((dt) => (
              <div
                key={dt.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Beaker className="size-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor={`grams-${dt.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    {dt.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Prefix: {dt.prefix}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      id={`grams-${dt.id}`}
                      type="number"
                      min="1"
                      step="0.5"
                      value={getDisplayValue(dt)}
                      onChange={(e) => handleChange(dt.id, e.target.value)}
                      className="w-20 pr-6 text-right font-mono"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      g
                    </span>
                  </div>
                  <Button
                    size="icon-sm"
                    variant={hasChanges(dt) ? "default" : "ghost"}
                    disabled={!hasChanges(dt) || saving === dt.id}
                    onClick={() => handleSave(dt.id)}
                  >
                    <Save className="size-4" />
                    <span className="sr-only">Save</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
