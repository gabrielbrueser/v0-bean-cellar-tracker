"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Coffee, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; cellarName?: string; error?: string } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/invite/${token}`);
    }
  }, [status, router, token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, error: data.error || "Failed to accept invite" });
        return;
      }

      setResult({ success: true, cellarName: data.cellarName });
      await mutate("/api/cellars");
      toast.success(`Joined ${data.cellarName}!`);
    } catch {
      setResult({ success: false, error: "An error occurred" });
    } finally {
      setAccepting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-amber-50/50 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            {result?.success ? (
              <Check className="size-8 text-green-600" />
            ) : result?.error ? (
              <X className="size-8 text-destructive" />
            ) : (
              <Users className="size-8 text-primary" />
            )}
          </div>
          <CardTitle>
            {result?.success
              ? "Welcome to the Cellar!"
              : result?.error
              ? "Invite Error"
              : "Cellar Invite"}
          </CardTitle>
          <CardDescription>
            {result?.success
              ? `You've joined ${result.cellarName}`
              : result?.error
              ? result.error
              : "You've been invited to share a coffee cellar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You can now see and brew from the shared inventory.
              </p>
              <Link href="/">
                <Button className="w-full">
                  <Coffee className="size-4 mr-2" />
                  Go to Home
                </Button>
              </Link>
            </div>
          ) : result?.error ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                This invite may have expired or already been used.
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Go to Home
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Logged in as</p>
                <p className="font-medium">{session?.user?.email}</p>
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-2" />
                    Accept Invite
                  </>
                )}
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
