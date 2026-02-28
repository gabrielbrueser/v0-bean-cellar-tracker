"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAllVials, useDoseTypes } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TestTube, Settings2, Pencil, AlertTriangle, Printer, LogOut, User, Users, UserPlus, Plus, CheckCircle2, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { CellarSwitcher } from "@/components/cellar-switcher";

interface VialWithDetails {
  id: string;
  vialCode: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  status: string;
  coffeeName?: string;
  roaster?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data: vials, isLoading: vialsLoading } = useAllVials(currentCellar?.id);
  const { data: doseTypes } = useDoseTypes();
  const [showVialManager, setShowVialManager] = useState(false);
  const [vialToDelete, setVialToDelete] = useState<VialWithDetails | null>(null);
  const [vialToRename, setVialToRename] = useState<VialWithDetails | null>(null);
  const [newVialCode, setNewVialCode] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showCreateDose, setShowCreateDose] = useState(false);
  const [isCreatingDose, setIsCreatingDose] = useState(false);
  const [createdDose, setCreatedDose] = useState<{ id: string; code: string } | null>(null);

  // Helper for cellar-scoped SWR keys
  const cellarParam = currentCellar?.id ? `cellarId=${currentCellar.id}` : "";
  const vialsUrl = currentCellar?.id ? `/api/vials/all?${cellarParam}` : null;
  const inventoryUrl = currentCellar?.id ? `/api/inventory?${cellarParam}` : null;

  const handleDeleteVial = async () => {
    if (!vialToDelete || !currentCellar?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vials/${vialToDelete.id}?${cellarParam}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Dose ${vialToDelete.vialCode} deleted`);
      // Mutate with exact SWR keys
      if (vialsUrl) mutate(vialsUrl);
      if (inventoryUrl) mutate(inventoryUrl);
      setVialToDelete(null);
    } catch {
      toast.error("Failed to delete dose");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateDose = async (doseTypeId: string) => {
    if (!currentCellar?.id) {
      toast.error("No cellar selected");
      return;
    }
    setIsCreatingDose(true);
    try {
      const res = await fetch(`/api/vials?${cellarParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doseTypeId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(errorData.error || "Couldn't create dose. Please try again.");
      }
      const dose = await res.json();
      setCreatedDose({ id: dose.id, code: dose.vialCode });
      // Mutate with exact SWR keys
      if (vialsUrl) mutate(vialsUrl);
      if (inventoryUrl) mutate(inventoryUrl);
      toast.success(`Dose ${dose.vialCode} created!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create dose. Please try again.");
    } finally {
      setIsCreatingDose(false);
    }
  };

  const handleRenameVial = async () => {
    if (!vialToRename || !newVialCode || !currentCellar?.id) return;
    
    const code = newVialCode.trim().toUpperCase();
    
    const prefix = vialToRename.vialCode.split("-")[0];
    const codeMatch = code.match(/^([A-Z]{2,3})-(\d{3})$/);
    
    if (!codeMatch) {
      setRenameError("Invalid format. Use format like ESP-001 or FLT-001");
      return;
    }
    
    if (codeMatch[1] !== prefix) {
      setRenameError(`Cannot change prefix. Must start with ${prefix}-`);
      return;
    }
    
    const existingVial = vials?.find((v: VialWithDetails) => v.vialCode === code && v.id !== vialToRename.id);
    if (existingVial) {
      setRenameError(`Code ${code} is already in use`);
      return;
    }
    
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/vials/${vialToRename.id}/rename?${cellarParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCode: code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to rename");
      }
      toast.success(`Dose renamed to ${code}`);
      // Mutate with exact SWR keys
      if (vialsUrl) mutate(vialsUrl);
      if (inventoryUrl) mutate(inventoryUrl);
      setVialToRename(null);
      setNewVialCode("");
      setRenameError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename dose";
      setRenameError(message);
    } finally {
      setIsRenaming(false);
    }
  };

  // Show loading state while cellar is loading
  if (cellarLoading || !currentCellar?.id) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Loading cellar...</p>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and doses
        </p>
      </div>

      {/* User Account Card */}
      {session?.user && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{session.user.name || session.user.email?.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cellar Management Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Cellar
          </CardTitle>
          <CardDescription>
            Switch between cellars or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <CellarSwitcher />
            <Link href="/settings/cellar">
              <Button variant="outline" size="sm">
                <UserPlus className="size-4 mr-2" />
                Invite Members
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Dose Management Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="size-4" />
            Dose Management
          </CardTitle>
          <CardDescription>
            Create, view, rename, and delete your doses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => setShowCreateDose(true)}
          >
            <Plus className="size-4 mr-2" />
            Create New Dose
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowVialManager(true)}
          >
            <Settings2 className="size-4 mr-2" />
            View All Doses ({vials?.length ?? 0})
          </Button>
          <Link href="/seal">
            <Button variant="outline" className="w-full">
              <Package className="size-4 mr-2" />
              Seal Doses
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Print Labels Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Printer className="size-4" />
            Print Labels
          </CardTitle>
          <CardDescription>
            Generate and print QR code labels for your doses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/print-labels">
            <Button variant="outline" className="w-full">
              <Printer className="size-4 mr-2" />
              Print Label Cards
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Vial Manager Dialog */}
      <Dialog open={showVialManager} onOpenChange={setShowVialManager}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Doses</DialogTitle>
            <DialogDescription>
              View, rename, or delete your doses. Renaming changes the display code only.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {vialsLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !vials || vials.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <TestTube className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No doses created yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(vials as VialWithDetails[]).map((vial) => (
                  <div
                    key={vial.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {vial.vialCode}
                        </span>
                        <Badge
                          variant={vial.status === "FULL" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {vial.status === "FULL" ? "Sealed" : "Empty"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {vial.status === "FULL" && vial.coffeeName
                          ? `${vial.coffeeName} - ${vial.roaster}`
                          : vial.doseTypeName}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setVialToRename(vial);
                          setNewVialCode(vial.vialCode);
                          setRenameError(null);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setVialToDelete(vial)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVialManager(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Vial Dialog */}
      <Dialog open={!!vialToRename} onOpenChange={() => { setVialToRename(null); setRenameError(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Dose</DialogTitle>
            <DialogDescription>
              Change the display code for this dose. The QR code will still work.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Renaming only changes how the dose is displayed. The internal ID and QR code remain the same.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Code
              </label>
              <Input
                value={newVialCode}
                onChange={(e) => {
                  setNewVialCode(e.target.value.toUpperCase());
                  setRenameError(null);
                }}
                placeholder="ESP-001"
                className="font-mono"
              />
              {renameError && (
                <p className="text-xs text-destructive">{renameError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVialToRename(null); setRenameError(null); }}>
              Cancel
            </Button>
            <Button onClick={handleRenameVial} disabled={isRenaming || !newVialCode}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vial Dialog */}
      <AlertDialog open={!!vialToDelete} onOpenChange={() => setVialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dose?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vialToDelete?.vialCode}</strong>?
              This action cannot be undone. Any associated fill sessions will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVial}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dose Dialog */}
      <Dialog open={showCreateDose} onOpenChange={(open) => { setShowCreateDose(open); if (!open) setCreatedDose(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Dose</DialogTitle>
            <DialogDescription>
              Select a dose type to create a new empty dose.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {createdDose ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground text-lg">{createdDose.code}</p>
                  <p className="text-sm text-muted-foreground">Dose created successfully!</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => { setCreatedDose(null); setShowCreateDose(false); }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {doseTypes?.map((dt: { id: string; name: string; gramsPerDose: number }) => (
                  <Button
                    key={dt.id}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1"
                    onClick={() => handleCreateDose(dt.id)}
                    disabled={isCreatingDose}
                  >
                    <span className="font-bold">{dt.name}</span>
                    <span className="text-xs text-muted-foreground">{dt.gramsPerDose}g</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
