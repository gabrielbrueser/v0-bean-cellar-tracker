"use client";

import Link from "next/link";
import { useVial } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG, getVialQRUrl } from "@/components/qr-code";
import { ArrowLeft, Printer, ExternalLink } from "lucide-react";

interface VialLabelProps {
  vialId: string;
}

export function VialLabel({ vialId }: VialLabelProps) {
  const { data: vial, isLoading } = useVial(vialId);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <Skeleton className="h-[300px] w-[300px]" />
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

  const qrUrl = getVialQRUrl(vial.vialCode);

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
        {/* Printable Label */}
        <div
          id="print-label"
          className="rounded-lg border border-border bg-white p-6 print:border-0 print:p-0 print:rounded-none"
        >
          <div className="flex flex-col items-center gap-4">
            {/* QR Code - SVG for crisp printing */}
            <div className="bg-white p-2">
              <QRCodeSVG value={qrUrl} size={220} />
            </div>

            {/* Vial Code */}
            <div className="text-center">
              <p className="font-mono text-2xl font-bold tracking-wider text-black">
                {vial.vialCode}
              </p>
            </div>

            {/* Branding - hidden in print */}
            <p className="text-xs text-gray-500 print:hidden">
              Bean Cellar Tracker
            </p>
          </div>
        </div>

        {/* Actions */}
        <Button onClick={handlePrint} className="w-full gap-2" size="lg">
          <Printer className="size-4" />
          Print Label
        </Button>

        {/* Test/Debug Info */}
        <div className="w-full rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            QR Code URL (for testing):
          </p>
          <p className="font-mono text-xs text-foreground break-all mb-2">
            {qrUrl}
          </p>
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            Open vial page
          </a>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          For best results, use a label printer with 2x1 inch stickers.
          The QR code links directly to this vial.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-label,
          #print-label * {
            visibility: visible !important;
          }
          #print-label {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: auto;
            max-width: 3in;
          }
        }
      `}</style>
    </div>
  );
}
