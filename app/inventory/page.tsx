"use client";

import { useState } from "react";
import Link from "next/link";
import { useAllVials } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG, getVialQRUrl } from "@/components/qr-code";
import { Package, ChevronRight, QrCode, Filter, ExternalLink } from "lucide-react";

interface VialItem {
  id: string;
  vialCode: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  qrValue: string;
  createdAt: string;
  status: "FULL" | "EMPTY";
  coffeeName?: string;
  roaster?: string;
}

export default function InventoryPage() {
  const [filter, setFilter] = useState<"FULL" | "EMPTY" | null>(null);
  const { data, isLoading } = useAllVials(filter);
  const [selectedVial, setSelectedVial] = useState<VialItem | null>(null);

  const fullCount =
    data?.filter((v: VialItem) => v.status === "FULL").length ?? 0;
  const emptyCount =
    data?.filter((v: VialItem) => v.status === "EMPTY").length ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          All your doses in one place
        </p>
      </header>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex rounded-lg border border-border p-1 bg-secondary/30">
          <Button
            variant={filter === null ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(null)}
          >
            All
          </Button>
          <Button
            variant={filter === "FULL" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("FULL")}
          >
            Sealed ({fullCount})
          </Button>
          <Button
            variant={filter === "EMPTY" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("EMPTY")}
          >
            Brewed ({emptyCount})
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Package className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No doses found
              </p>
              <p className="text-xs text-muted-foreground">
                {filter
                  ? `No ${filter === "FULL" ? "sealed" : "brewed"} doses. Try changing the filter.`
                  : "Create doses to see them here."}
              </p>
            </div>
            <Link href="/vials/create">
              <Button size="sm">Create a Dose</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {(data as VialItem[])
            .filter((v) => (filter ? v.status === filter : true))
            .map((vial) => (
              <Card
                key={vial.id}
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => setSelectedVial(vial)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <QrCode className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Big title: Coffee name or "Empty" */}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground truncate">
                        {vial.status === "FULL" && vial.coffeeName
                          ? vial.coffeeName
                          : "Brewed Dose"}
                      </span>
                      <Badge
                        variant={vial.status === "FULL" ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {vial.status === "FULL" ? "Sealed" : "Brewed"}
                      </Badge>
                    </div>
                    {/* Secondary: Roaster + dose info */}
                    <p className="text-sm text-muted-foreground truncate">
                      {vial.status === "FULL" && vial.roaster
                        ? `${vial.roaster} · `
                        : ""}
                      {vial.doseTypeName} ({vial.gramsPerDose}g)
                    </p>
                    {/* Small: Vial code */}
                    <p className="text-xs text-muted-foreground/70 font-mono">
                      {vial.vialCode}
                    </p>
                  </div>
                  <Link
                    href={`/vials/${vial.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!selectedVial} onOpenChange={() => setSelectedVial(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedVial?.vialCode}
            </DialogTitle>
          </DialogHeader>
          {selectedVial && <QRCodeDisplay vial={selectedVial} />}
          <div className="flex gap-2 mt-4">
            <Link href={`/vials/${selectedVial?.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
            <Link href={`/vials/${selectedVial?.id}/label`} className="flex-1">
              <Button className="w-full">Print Label</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QRCodeDisplay({ vial }: { vial: VialItem }) {
  const qrUrl = getVialQRUrl(vial.vialCode);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-4">
        <QRCodeSVG value={qrUrl} size={200} />
      </div>
      <div className="text-center">
        <p className="font-mono text-xs text-muted-foreground break-all">
          {qrUrl}
        </p>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        >
          <ExternalLink className="size-3" />
          Test link
        </a>
        {vial.status === "FULL" && vial.coffeeName && (
          <div className="mt-2">
            <p className="font-bold text-foreground">{vial.coffeeName}</p>
            <p className="text-sm text-muted-foreground">{vial.roaster}</p>
          </div>
        )}
      </div>
    </div>
  );
}
