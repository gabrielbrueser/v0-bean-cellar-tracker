"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useActivity, useAllVials, useDoseTypes } from "@/lib/hooks";
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
import { Label } from "@/components/ui/label";
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
import { Coffee, Clock, Beaker, Trash2, TestTube, Settings2, Pencil, AlertTriangle, Printer, LogOut, User, Users, UserPlus, Mail } from "lucide-react";
import Link from "next/link";
import { CellarSwitcher } from "@/components/cellar-switcher";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  timestamp: string;
  brewMethod: string;
  notes: string;
  grindSize: number | null;
  gramsPerDose: number;
  roastDate: string;
  vialCode: string;
  coffeeName: string;
  roaster: string;
  doseTypeName: string;
  userName: string | null;
}

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
  const { data: activities, isLoading: activitiesLoading } = useActivity();
  const { data: vials, isLoading: vialsLoading } = useAllVials();
  const { data: doseTypes } = useDoseTypes();
  const [showVialManager, setShowVialManager] = useState(false);
  const [vialToDelete, setVialToDelete] = useState<VialWithDetails | null>(null);
  const [vialToRename, setVialToRename] = useState<VialWithDetails | null>(null);
  const [newVialCode, setNewVialCode] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);

  const handleDeleteVial = async () => {
    if (!vialToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/vials/${vialToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Dose ${vialToDelete.vialCode} deleted`);
      mutate("/api/vials/all");
      mutate("/api/inventory");
      mutate("vials");
      setVialToDelete(null);
    } catch {
      toast.error("Failed to delete dose");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setIsDeletingActivity(true);
    try {
      const res = await fetch(`/api/activity/${activityToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Activity deleted");
      mutate("/api/activity");
      mutate("/api/inventory");
      mutate("/api/vials/all");
      setActivityToDelete(null);
    } catch {
      toast.error("Failed to delete activity");
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const handleRenameVial = async () => {
    if (!vialToRename || !newVialCode) return;
    
    const code = newVialCode.trim().toUpperCase();
    
    // Validate format
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
    
    // Check if code is already in use
    const existingVial = vials?.find((v: VialWithDetails) => v.vialCode === code && v.id !== vialToRename.id);
    if (existingVial) {
      setRenameError(`Code ${code} is already in use`);
      return;
    }
    
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/vials/${vialToRename.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCode: code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to rename");
      }
      toast.success(`Vial renamed to ${code}`);
      mutate("/api/vials/all");
      mutate("/api/inventory");
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

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage doses and view activity history
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

      {/* Vial Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube className="size-4" />
            Dose Management
          </CardTitle>
          <CardDescription>
            View, rename, and delete your doses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowVialManager(true)}
          >
            <Settings2 className="size-4 mr-2" />
            Manage Doses ({vials?.length ?? 0})
          </Button>
          <Link href="/print-labels">
            <Button variant="outline" className="w-full">
              <Printer className="size-4 mr-2" />
              Print Label Cards
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Activity History Card */}
      <Card className="mt-4">
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
          {activitiesLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Coffee className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Brew a dose to see your history here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
              {(activities as Activity[]).slice(0, 20).map((activity) => (
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
                      {activity.userName && ` &middot; by ${activity.userName}`}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setActivityToDelete(activity)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Card */}
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
                          {vial.status === "FULL" ? "Sealed" : "Brewed"}
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
              <p className="text-xs text-amber-700">
                Renaming changes the display code only. Existing printed QR labels will continue to work.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCode">New Dose Code</Label>
              <Input
                id="newCode"
                value={newVialCode}
                onChange={(e) => {
                  setNewVialCode(e.target.value.toUpperCase());
                  setRenameError(null);
                }}
                placeholder={vialToRename?.vialCode}
                className="font-mono"
              />
              {renameError && (
                <p className="text-xs text-destructive">{renameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must keep the same prefix ({vialToRename?.vialCode.split("-")[0]}-XXX)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVialToRename(null); setRenameError(null); }}>
              Cancel
            </Button>
            <Button onClick={handleRenameVial} disabled={isRenaming || !newVialCode.trim()}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vial Confirmation Dialog */}
      <AlertDialog open={!!vialToDelete} onOpenChange={() => setVialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dose?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete dose{" "}
              <span className="font-mono font-medium">{vialToDelete?.vialCode}</span>?
              This will permanently remove the dose and all its seal history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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

      {/* Delete Activity Confirmation Dialog */}
      <AlertDialog open={!!activityToDelete} onOpenChange={() => setActivityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this brew log for{" "}
              <span className="font-medium">{activityToDelete?.coffeeName}</span>?
              This will also restore the vial to its previous state if applicable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingActivity}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActivity}
              disabled={isDeletingActivity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingActivity ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
