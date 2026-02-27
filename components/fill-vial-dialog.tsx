"use client";

import { useState } from "react";
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
import { useCoffees } from "@/lib/hooks";
import { fillVial } from "@/lib/firestore";
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
  const { data: coffees } = useCoffees();
  const [coffeeId, setCoffeeId] = useState("");
  const [roastDate, setRoastDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewCoffee, setShowNewCoffee] = useState(false);

  const handleFill = async () => {
    if (!coffeeId || !roastDate) {
      toast.error("Please select a coffee and enter a roast date");
      return;
    }
    setLoading(true);
    try {
      await fillVial(vialId, coffeeId, doseTypeId, roastDate);
      toast.success("Vial filled!", { description: "Ready for brewing." });
      mutate(`vial-${vialId}`);
      mutate(`fill-active-${vialId}`);
      mutate(`fill-sessions-${vialId}`);
      mutate("inventory");
      mutate("vials");
      onOpenChange(false);
      setCoffeeId("");
      setRoastDate("");
    } catch {
      toast.error("Failed to fill vial");
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
              mutate("coffees");
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
            {hasActiveFill ? "Refill Vial" : "Fill Vial"}
          </DialogTitle>
          <DialogDescription>
            {hasActiveFill
              ? "The current coffee will be archived and replaced."
              : "Choose a coffee and enter the roast date."}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleFill} disabled={loading}>
            {loading ? "Filling..." : "Fill Vial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
