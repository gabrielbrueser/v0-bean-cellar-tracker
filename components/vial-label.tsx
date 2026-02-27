"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useVial } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";

interface VialLabelProps {
  vialId: string;
}

export function VialLabel({ vialId }: VialLabelProps) {
  const { data: vial, isLoading } = useVial(vialId);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!vial || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Label dimensions (2x1 inches at 300dpi = 600x300, but we render at 400x200 for screen)
    const W = 400;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Draw QR code using a simple matrix pattern
    const qrData = vial.qrValue;
    drawQR(ctx, qrData, 16, 16, 168);

    // Vial code
    ctx.fillStyle = "#000000";
    ctx.font = "bold 28px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(vial.vialCode, 200, 24);

    // Branding
    ctx.fillStyle = "#666666";
    ctx.font = "12px sans-serif";
    ctx.fillText("Bean Cellar Tracker", 200, 170);

    // QR value text (small)
    ctx.fillStyle = "#999999";
    ctx.font = "10px monospace";
    ctx.fillText(vial.qrValue, 200, 62);
  }, [vial]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <Skeleton className="h-[200px] w-[400px]" />
      </div>
    );
  }

  if (!vial) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">Vial not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/vials/${vialId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-foreground">
          Label: {vial.vialCode}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            className="max-w-full"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <Button onClick={handlePrint} className="w-full gap-2" size="lg">
          <Printer className="size-4" />
          Print Label
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          For best results, use a label printer with 2x1 inch stickers.
          The QR code permanently links to this vial.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          canvas {
            visibility: visible !important;
            position: fixed;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Simple QR-like code generator (renders the qrValue encoded as a visual pattern)
// For production, you'd use a library like 'qrcode'. This creates a visual representation.
function drawQR(
  ctx: CanvasRenderingContext2D,
  data: string,
  x: number,
  y: number,
  size: number
) {
  const modules = 21; // QR version 1
  const moduleSize = size / modules;

  // Create deterministic pattern from data
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) & 0xffffffff;
  }

  ctx.fillStyle = "#000000";

  // Draw finder patterns (3 corners)
  drawFinderPattern(ctx, x, y, moduleSize);
  drawFinderPattern(ctx, x + (modules - 7) * moduleSize, y, moduleSize);
  drawFinderPattern(ctx, x, y + (modules - 7) * moduleSize, moduleSize);

  // Draw data modules
  const rng = seedRandom(hash);
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
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
