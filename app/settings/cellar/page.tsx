"use client";

import { useState } from "react";
import { useCellarContext } from "@/lib/cellar-context";
import { useCellarInvites } from "@/lib/hooks";
import { mutate } from "swr";
import { toast } from "sonner";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, UserPlus, Mail, Copy, Check, Loader2 } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  role: string;
  token?: string;
  createdAt: string;
  expiresAt: string;
}

export default function CellarSettingsPage() {
  const { currentCellar, cellars, isLoading: cellarLoading } = useCellarContext();
  const { data: invites, isLoading: invitesLoading } = useCellarInvites(currentCellar?.id || null);
  
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInviteToken, setNewInviteToken] = useState<string | null>(null);

  const isOwnerOrAdmin = currentCellar?.role === "owner" || currentCellar?.role === "admin";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentCellar) return;

    setSending(true);
    try {
      const res = await fetch(`/api/cellars/${currentCellar.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invite");
      }

      const data = await res.json();
      setNewInviteToken(data.token);
      setEmail("");
      mutate(`/api/cellars/${currentCellar.id}/invites`);
      toast.success(`Invite sent to ${data.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = (token: string, inviteId: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inviteId);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (cellarLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!currentCellar) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" />
          Back to Settings
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="size-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No cellar selected. Create or join a cellar first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-8">
      <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" />
        Back to Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="size-5" />
          {currentCellar.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {currentCellar.memberCount} member{currentCellar.memberCount !== 1 ? "s" : ""} · You are {currentCellar.role}
        </p>
      </div>

      {/* Invite New Member */}
      {isOwnerOrAdmin && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="size-4" />
              Invite Member
            </CardTitle>
            <CardDescription>
              Invite someone to share this cellar with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member - Can view and brew</SelectItem>
                    <SelectItem value="admin">Admin - Can also invite others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={sending || !email.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="size-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </form>

            {/* Show new invite link */}
            {newInviteToken && (
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-700 mb-2">
                  Invite created! Share this link:
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${newInviteToken}`}
                    className="text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyInviteLink(newInviteToken, "new")}
                  >
                    {copiedId === "new" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="size-4" />
            Pending Invites
          </CardTitle>
          <CardDescription>
            Invites that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !invites || invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending invites
            </p>
          ) : (
            <div className="space-y-2">
              {(invites as Invite[]).map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {invite.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {invite.token && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyInviteLink(invite.token!, invite.id)}
                    >
                      {copiedId === invite.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
