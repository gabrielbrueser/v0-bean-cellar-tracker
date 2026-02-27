"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useCoffee, useProcessMethods } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CoffeeForm } from "@/components/coffee-form";
import { ArrowLeft, Edit, Star, ExternalLink } from "lucide-react";

export default function CoffeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: coffee, isLoading, mutate } = useCoffee(id);
  const { data: processMethods } = useProcessMethods();
  const [showEdit, setShowEdit] = useState(false);

  const processName =
    processMethods?.find((pm) => pm.id === coffee?.processMethodId)?.name ?? "";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6">
        <Skeleton className="h-8 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!coffee) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-6 flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">Coffee not found</p>
        <Link href="/coffees">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/coffees">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="flex-1 text-xl font-bold text-foreground truncate">
          {coffee.coffeeName}
        </h1>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setShowEdit(true)}
        >
          <Edit className="size-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{coffee.coffeeName}</CardTitle>
            {coffee.score > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="size-3 fill-current" />
                {coffee.score}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Roaster</span>
              <p className="font-medium text-foreground">{coffee.roaster}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Origin</span>
              <p className="font-medium text-foreground">{coffee.origin}</p>
            </div>
            {coffee.producer && (
              <div>
                <span className="text-muted-foreground text-xs">Producer</span>
                <p className="font-medium text-foreground">{coffee.producer}</p>
              </div>
            )}
            {coffee.variety && (
              <div>
                <span className="text-muted-foreground text-xs">Variety</span>
                <p className="font-medium text-foreground">{coffee.variety}</p>
              </div>
            )}
            {coffee.altitude && (
              <div>
                <span className="text-muted-foreground text-xs">Altitude</span>
                <p className="font-medium text-foreground">{coffee.altitude}</p>
              </div>
            )}
            {processName && (
              <div>
                <span className="text-muted-foreground text-xs">Process</span>
                <p className="font-medium text-foreground">{processName}</p>
              </div>
            )}
          </div>

          {coffee.tastingNotes && (
            <div className="border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">
                Tasting Notes
              </span>
              <p className="text-sm text-foreground">{coffee.tastingNotes}</p>
            </div>
          )}

          {coffee.notes && (
            <div>
              <span className="text-xs text-muted-foreground">Notes</span>
              <p className="text-sm text-foreground">{coffee.notes}</p>
            </div>
          )}

          {coffee.link && (
            <a
              href={coffee.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              View online
            </a>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coffee</DialogTitle>
            <DialogDescription>
              Update the details for this coffee.
            </DialogDescription>
          </DialogHeader>
          <CoffeeForm
            coffee={coffee}
            onSave={() => {
              setShowEdit(false);
              mutate();
            }}
            onCancel={() => setShowEdit(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
