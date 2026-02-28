"use client";

import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProcessMethods } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import type { Coffee } from "@/lib/types";
import { LabelScanner } from "@/components/label-scanner";
import { Camera } from "lucide-react";

interface CoffeeFormProps {
  coffee?: Coffee;
  onSave: (coffee: Coffee) => void;
  onCancel: () => void;
}

export function CoffeeForm({ coffee, onSave, onCancel }: CoffeeFormProps) {
  const { currentCellar } = useCellarContext();
  const { data: processMethods, mutate: mutatePM } = useProcessMethods();
  const [loading, setLoading] = useState(false);
  const [showCustomProcess, setShowCustomProcess] = useState(false);
  const [customProcess, setCustomProcess] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const COFFEE_COLORS = [
    { value: "amber", label: "Amber", class: "bg-amber-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "red", label: "Red", class: "bg-red-500" },
    { value: "pink", label: "Pink", class: "bg-pink-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "teal", label: "Teal", class: "bg-teal-500" },
    { value: "green", label: "Green", class: "bg-green-500" },
  ];

  const [form, setForm] = useState({
    roaster: coffee?.roaster ?? "Tanat",
    coffeeName: coffee?.coffeeName ?? "",
    score: coffee?.score ?? 0,
    origin: coffee?.origin ?? "",
    producer: coffee?.producer ?? "",
    variety: coffee?.variety ?? "",
    altitude: coffee?.altitude ?? "",
    tastingNotes: coffee?.tastingNotes ?? "",
    notes: coffee?.notes ?? "",
    link: coffee?.link ?? "",
    processMethodId: coffee?.processMethodId ?? "",
    color: coffee?.color ?? "",
  });

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProcessChange = (value: string) => {
    if (value === "__new__") {
      setShowCustomProcess(true);
      return;
    }
    handleChange("processMethodId", value);
  };

  const handleScanData = async (data: {
    coffeeName: string | null;
    roaster: string | null;
    origin: string | null;
    producer: string | null;
    variety: string | null;
    altitude: string | null;
    processMethod: string | null;
    tastingNotes: string | null;
    score: number | null;
  }) => {
    // Auto-fill form with extracted data
    if (data.coffeeName) handleChange("coffeeName", data.coffeeName);
    if (data.roaster) handleChange("roaster", data.roaster);
    if (data.origin) handleChange("origin", data.origin);
    if (data.producer) handleChange("producer", data.producer);
    if (data.variety) handleChange("variety", data.variety);
    if (data.altitude) handleChange("altitude", data.altitude);
    if (data.tastingNotes) handleChange("tastingNotes", data.tastingNotes);
    if (data.score) handleChange("score", data.score);

    // Try to match process method
    if (data.processMethod && processMethods) {
      const matchedProcess = processMethods.find(
        (pm) =>
          pm.name.toLowerCase().includes(data.processMethod!.toLowerCase()) ||
          data.processMethod!.toLowerCase().includes(pm.name.toLowerCase())
      );
      if (matchedProcess) {
        handleChange("processMethodId", matchedProcess.id);
      } else {
        // Auto-create the new process method
        try {
          const res = await fetch("/api/process-methods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.processMethod.trim() }),
          });
          if (res.ok) {
            const pm = await res.json();
            handleChange("processMethodId", pm.id);
            mutatePM();
            toast.success(`Process "${data.processMethod}" added`);
          }
        } catch {
          // Fallback: show custom process input
          setCustomProcess(data.processMethod);
          setShowCustomProcess(true);
        }
      }
    }

    toast.success("Label data imported!", {
      description: "Review and adjust the fields as needed.",
    });
  };

  const handleAddCustomProcess = async () => {
    if (!customProcess.trim()) return;
    try {
      const res = await fetch("/api/process-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customProcess.trim() }),
      });
      const pm = await res.json();
      handleChange("processMethodId", pm.id);
      setShowCustomProcess(false);
      setCustomProcess("");
      mutatePM();
      toast.success("Process method added");
    } catch {
      toast.error("Failed to add process method");
    }
  };

  const handleSubmit = async () => {
    if (!form.coffeeName.trim() || !form.origin.trim()) {
      toast.error("Coffee name and origin are required");
      return;
    }
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setLoading(true);
    try {
      if (coffee) {
        // PUT also requires cellarId in query param for scoping
        const res = await fetch(`/api/coffees/${coffee.id}?cellarId=${currentCellar.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update coffee");
        }
        const updated = await res.json();
        // Mutate the correct SWR keys
        mutate(`/api/coffees?cellarId=${currentCellar.id}`);
        mutate(`/api/coffees/${coffee.id}?cellarId=${currentCellar.id}`);
        onSave(updated);
        toast.success("Coffee updated");
      } else {
        // POST to same URL as GET for proper SWR cache invalidation
        const apiUrl = `/api/coffees?cellarId=${currentCellar.id}`;
        
        // Create optimistic coffee object with temporary ID
        const optimisticCoffee = {
          id: `temp-${Date.now()}`,
          ...form,
          archived: false,
          createdAt: new Date().toISOString(),
          cellarId: currentCellar.id,
          totalBrews: 0,
        };
        
        // Optimistic update: immediately add to cache
        await mutate(
          apiUrl,
          async (currentData: unknown[] | undefined) => {
            // Add optimistic coffee to the beginning of the list
            return [optimisticCoffee, ...(currentData || [])];
          },
          { revalidate: false } // Don't revalidate yet
        );
        
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        
        if (!res.ok) {
          // Rollback optimistic update on error
          await mutate(apiUrl);
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create coffee");
        }
        
        const created = await res.json();
        if (!created.id) {
          // Rollback optimistic update on error
          await mutate(apiUrl);
          throw new Error("Coffee created but no ID returned");
        }
        
        // Replace optimistic coffee with real one from server
        await mutate(
          apiUrl,
          async (currentData: unknown[] | undefined) => {
            if (!currentData) return [created];
            // Replace the temp coffee with the real one
            return currentData.map((c: unknown) => {
              const coffee = c as { id: string };
              return coffee.id === optimisticCoffee.id ? created : c;
            });
          },
          { revalidate: true } // Now revalidate to ensure consistency
        );
        
        onSave(created);
        toast.success("Coffee created");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save coffee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Scan Label Button */}
      {!coffee && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 w-full border-dashed"
          onClick={() => setShowScanner(true)}
        >
          <Camera className="size-4" />
          Scan Coffee Label
        </Button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-name">Coffee Name *</Label>
          <Input
            id="cf-name"
            value={form.coffeeName}
            onChange={(e) => handleChange("coffeeName", e.target.value)}
            placeholder="Finca Deborah"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-roaster">Roaster</Label>
          <Input
            id="cf-roaster"
            value={form.roaster}
            onChange={(e) => handleChange("roaster", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-score">Score</Label>
          <Input
            id="cf-score"
            type="number"
            value={form.score || ""}
            onChange={(e) => handleChange("score", Number(e.target.value))}
            placeholder="89"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-origin">Origin *</Label>
          <Input
            id="cf-origin"
            value={form.origin}
            onChange={(e) => handleChange("origin", e.target.value)}
            placeholder="Ethiopia"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-producer">Producer</Label>
          <Input
            id="cf-producer"
            value={form.producer}
            onChange={(e) => handleChange("producer", e.target.value)}
            placeholder="Farm / Washing Station"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-variety">Variety</Label>
          <Input
            id="cf-variety"
            value={form.variety}
            onChange={(e) => handleChange("variety", e.target.value)}
            placeholder="Gesha"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-altitude">Altitude</Label>
          <Input
            id="cf-altitude"
            value={form.altitude}
            onChange={(e) => handleChange("altitude", e.target.value)}
            placeholder="1800-2000m"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cf-process">Process</Label>
          {showCustomProcess ? (
            <div className="flex gap-1">
              <Input
                value={customProcess}
                onChange={(e) => setCustomProcess(e.target.value)}
                placeholder="e.g. Bioreactor Inoculation"
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddCustomProcess}>
                Add
              </Button>
            </div>
          ) : (
            <Select
              value={form.processMethodId}
              onValueChange={handleProcessChange}
            >
              <SelectTrigger id="cf-process" className="w-full">
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                {processMethods?.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                    {pm.isCustom ? " (custom)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">
                  Other / Add new...
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cf-tasting">Tasting Notes</Label>
        <Input
          id="cf-tasting"
          value={form.tastingNotes}
          onChange={(e) => handleChange("tastingNotes", e.target.value)}
          placeholder="Floral, bergamot, honey"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cf-notes">Notes</Label>
        <Textarea
          id="cf-notes"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={2}
          placeholder="Personal notes..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cf-link">Link</Label>
        <Input
          id="cf-link"
          type="url"
          value={form.link}
          onChange={(e) => handleChange("link", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color Tag</Label>
        <div className="flex flex-wrap gap-2">
          {COFFEE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleChange("color", form.color === c.value ? "" : c.value)}
              className={`
                size-8 rounded-full transition-all
                ${c.class}
                ${form.color === c.value 
                  ? "ring-2 ring-offset-2 ring-foreground scale-110" 
                  : "opacity-60 hover:opacity-100"
                }
              `}
              title={c.label}
            />
          ))}
          {form.color && (
            <button
              type="button"
              onClick={() => handleChange("color", "")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Optional: assign a color to quickly identify this coffee
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : coffee ? "Update" : "Create"}
        </Button>
      </div>

      {/* Label Scanner Dialog */}
      <LabelScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onDataExtracted={handleScanData}
      />
    </div>
  );
}
