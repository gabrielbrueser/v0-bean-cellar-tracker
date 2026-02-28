"use client";

import { useState } from "react";
import { useCellarContext } from "@/lib/cellar-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";

export function CellarSwitcher() {
  const { cellars, currentCellar, setCurrentCellarId, isLoading } = useCellarContext();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/cellars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create cellar");

      const cellar = await res.json();
      await mutate("/api/cellars");
      setCurrentCellarId(cellar.id);
      setShowCreate(false);
      setNewName("");
      toast.success(`Created "${cellar.name}"`);
    } catch {
      toast.error("Failed to create cellar");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Users className="size-4" />
        Loading...
      </Button>
    );
  }

  if (cellars.length === 0) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-4" />
          Create Cellar
        </Button>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Cellar</DialogTitle>
              <DialogDescription>
                A cellar is a shared space for tracking coffee. Name it after your household or group.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="cellar-name">Cellar Name</Label>
              <Input
                id="cellar-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Home, Office, The Smiths"
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? "Creating..." : "Create Cellar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 max-w-[160px]">
            <Users className="size-4 shrink-0" />
            <span className="truncate">{currentCellar?.name || "Select"}</span>
            <ChevronDown className="size-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Your Cellars</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {cellars.map((cellar) => (
            <DropdownMenuItem
              key={cellar.id}
              onClick={() => setCurrentCellarId(cellar.id)}
              className="gap-2"
            >
              {currentCellar?.id === cellar.id && (
                <Check className="size-4" />
              )}
              {currentCellar?.id !== cellar.id && (
                <span className="size-4" />
              )}
              <span className="truncate flex-1">{cellar.name}</span>
              <span className="text-xs text-muted-foreground">
                {cellar.memberCount}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="size-4" />
            New Cellar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cellar</DialogTitle>
            <DialogDescription>
              Create a separate space for tracking coffee with different people.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cellar-name-new">Cellar Name</Label>
            <Input
              id="cellar-name-new"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Office, Vacation Home"
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
