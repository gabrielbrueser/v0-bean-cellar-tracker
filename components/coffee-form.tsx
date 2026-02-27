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
import { createCoffee, updateCoffee, addProcessMethod } from "@/lib/firestore";
import type { Coffee } from "@/lib/types";

interface CoffeeFormProps {
  coffee?: Coffee;
  onSave: (coffee: Coffee) => void;
  onCancel: () => void;
}

export function CoffeeForm({ coffee, onSave, onCancel }: CoffeeFormProps) {
  const { data: processMethods, mutate: mutatePM } = useProcessMethods();
  const [loading, setLoading] = useState(false);
  const [showCustomProcess, setShowCustomProcess] = useState(false);
  const [customProcess, setCustomProcess] = useState("");

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

  const handleAddCustomProcess = async () => {
    if (!customProcess.trim()) return;
    try {
      const pm = await addProcessMethod(customProcess.trim());
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
    setLoading(true);
    try {
      if (coffee) {
        await updateCoffee(coffee.id, form);
        const updated = { ...coffee, ...form };
        mutate("coffees");
        onSave(updated);
        toast.success("Coffee updated");
      } else {
        const created = await createCoffee(form);
        mutate("coffees");
        onSave(created);
        toast.success("Coffee created");
      }
    } catch {
      toast.error("Failed to save coffee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : coffee ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}
