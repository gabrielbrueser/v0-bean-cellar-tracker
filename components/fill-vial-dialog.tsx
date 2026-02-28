"use client";

import { useState, useEffect } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCoffees, useDoseTypes } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { CoffeeForm } from "@/components/coffee-form";

interface FillVialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vialId: string;
  doseTypeId: string;
  hasActiveFill: boolean;
}

export function FillVialDialog({
  open,
  onOpenChange,
  vialId,
  doseTypeId,
  hasActiveFill,
}: FillVialDialogProps) {
  const { currentCellar } = useCellarContext();
  const { data: coffees } = useCoffees(currentCellar?.id);
  const { data: doseTypes } = useDoseTypes();
  const [coffeeId, setCoffeeId] = useState("");
  const [roastDate, setRoastDate] = useState("");
  const [grams, setGrams] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [showNewCoffee, setShowNewCoffee] = useState(false);

  // Helper for cellar-scoped SWR keys
  const cellarParam = currentCellar?.id ? `cellarId=${currentCellar.id}` : "";

  // Set default grams from dose type when dialog opens
  const currentDoseType = doseTypes?.find((dt) => dt.id === doseTypeId);
  useEffect(() => {
    if (open && currentDoseType) {
      setGrams(currentDoseType.gramsPerDose);
    }
  }, [open, currentDoseType]);

  const handleFill = async () => {
    if (!coffeeId || !roastDate) {
      toast.error("Please select a coffee and enter a roast date");
      return;
    }
    if (!grams || grams <= 0) {
      toast.error("Please enter a valid grammage");
      return;
    }
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/vials/${vialId}/fill?${cellarParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coffeeId, doseTypeId, roastDate, gramsPerDose: grams }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to seal dose");
      }
      toast.success("Dose sealed!", { description: `${grams}g ready for brewing.` });
      // Refresh with exact SWR keys
      mutate(`/api/vials/${vialId}`);
      mutate(`/api/vials/${vialId}/fill-sessions`);
      mutate(`/api/inventory?${cellarParam}`);
      mutate(`/api/vials?${cellarParam}`);
      mutate(`/api/vials/all?${cellarParam}`);
      onOpenChange(false);
      setCoffeeId("");
      setRoastDate("");
      setGrams("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seal dose");
    } finally {
      setLoading(false);
    }
  };

  if (showNewCoffee) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Coffee</DialogTitle>
            <DialogDescription>
              Enter the details for a new coffee.
            </DialogDescription>
          </DialogHeader>
          <CoffeeForm
            onSave={(newCoffee) => {
              setCoffeeId(newCoffee.id);
              setShowNewCoffee(false);
              mutate(`/api/coffees?${cellarParam}`);
            }}
            onCancel={() => setShowNewCoffee(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hasActiveFill ? "Reseal Dose" : "Seal Dose"}
          </DialogTitle>
          <DialogDescription>
            {hasActiveFill
              ? "The current coffee will be archived and replaced."
              : "Select a coffee and roast date to seal this dose."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="coffee-select">Coffee</Label>
            <Select value={coffeeId} onValueChange={setCoffeeId}>
              <SelectTrigger id="coffee-select" className="w-full">
                <SelectValue placeholder="Select a coffee" />
              </SelectTrigger>
              <SelectContent>
                {coffees?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.coffeeName} ({c.roaster})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-xs text-primary"
              onClick={() => setShowNewCoffee(true)}
            >
              + Add new coffee
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="roast-date">Roast Date</Label>
            <Input
              id="roast-date"
              type="date"
              value={roastDate}
              onChange={(e) => setRoastDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="grams">Grammage (g)</Label>
            <Input
              id="grams"
              type="number"
              step="0.1"
              min="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value ? parseFloat(e.target.value) : "")}
              placeholder={currentDoseType ? `Default: ${currentDoseType.gramsPerDose}g` : ""}
            />
            <p className="text-xs text-muted-foreground">
              {currentDoseType ? `${currentDoseType.name} default: ${currentDoseType.gramsPerDose}g` : ""}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleFill} disabled={loading}>
            {loading ? "Sealing..." : "Seal Dose"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
