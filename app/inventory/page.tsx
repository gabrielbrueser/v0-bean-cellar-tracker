"use client";

import { useState, useEffect, useRef } from "react";
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
import { Package, ChevronRight, QrCode, Filter } from "lucide-react";

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

  const fullCount = data?.filter((v: VialItem) => v.status === "FULL").length ?? 0;
  const emptyCount = data?.filter((v: VialItem) => v.status === "EMPTY").length ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          All your vials in one place
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
            Full ({fullCount})
          </Button>
          <Button
            variant={filter === "EMPTY" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("EMPTY")}
          >
            Empty ({emptyCount})
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Package className="size-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                No vials found
              </p>
              <p className="text-xs text-muted-foreground">
                {filter
                  ? `No ${filter.toLowerCase()} vials. Try changing the filter.`
                  : "Create vials to see them here."}
              </p>
            </div>
            <Link href="/vials/create">
              <Button size="sm">Create a Vial</Button>
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
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <QrCode className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground">
                        {vial.vialCode}
                      </span>
                      <Badge
                        variant={vial.status === "FULL" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {vial.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {vial.status === "FULL" && vial.coffeeName
                        ? `${vial.coffeeName} - ${vial.roaster}`
                        : `${vial.doseTypeName} (${vial.gramsPerDose}g)`}
                    </p>
                  </div>
                  <Link
                    href={`/vials/${vial.id}`}
                    onClick={(e) => e.stopPropagation()}
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
            <DialogTitle className="font-mono">{selectedVial?.vialCode}</DialogTitle>
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    drawQR(ctx, vial.qrValue, 10, 10, 180);
  }, [vial.qrValue]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-white p-4">
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated" }} />
      </div>
      <div className="text-center">
        <p className="font-mono text-xs text-muted-foreground">{vial.qrValue}</p>
        {vial.status === "FULL" && vial.coffeeName && (
          <p className="text-sm text-foreground mt-1">
            {vial.coffeeName} - {vial.roaster}
          </p>
        )}
      </div>
    </div>
  );
}

// QR code drawing functions
function drawQR(
  ctx: CanvasRenderingContext2D,
  data: string,
  x: number,
  y: number,
  size: number
) {
  const modules = 21;
  const moduleSize = size / modules;

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) & 0xffffffff;
  }

  ctx.fillStyle = "#000000";

  drawFinderPattern(ctx, x, y, moduleSize);
  drawFinderPattern(ctx, x + (modules - 7) * moduleSize, y, moduleSize);
  drawFinderPattern(ctx, x, y + (modules - 7) * moduleSize, moduleSize);

  const rng = seedRandom(hash);
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (
        (row < 8 && col < 8) ||
        (row < 8 && col >= modules - 8) ||
        (row >= modules - 8 && col < 8)
      ) {
        continue;
      }

      if (rng() > 0.5) {
        ctx.fillRect(
          x + col * moduleSize,
          y + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
}

function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  moduleSize: number
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
  ctx.fillStyle = "#000000";
  ctx.fillRect(
    x + moduleSize * 2,
    y + moduleSize * 2,
    moduleSize * 3,
    moduleSize * 3
  );
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
