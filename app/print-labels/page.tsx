"use client";

import { useState } from "react";
import Link from "next/link";
import { useAllVials, useDoseTypes } from "@/lib/hooks";
import { useCellarContext } from "@/lib/cellar-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG, getVialQRUrl } from "@/components/qr-code";
import { ArrowLeft, Printer, Package } from "lucide-react";

interface VialItem {
  id: string;
  vialCode: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  qrValue: string;
  status: "FULL" | "EMPTY";
  coffeeName?: string;
  roaster?: string;
}

export default function PrintLabelsPage() {
  const { currentCellar, isLoading: cellarLoading } = useCellarContext();
  const { data: allVials, isLoading: vialsLoading } = useAllVials(currentCellar?.id);
  const { data: doseTypes } = useDoseTypes();
  const [selectedVials, setSelectedVials] = useState<string[]>([]);
  const [showPrintView, setShowPrintView] = useState(false);

  const vials = allVials || [];

  // Show loading state while cellar or vials are loading
  if (cellarLoading || !currentCellar?.id || vialsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Group vials by dose type
  const vialsByDoseType = vials.reduce((acc: Record<string, VialItem[]>, vial: VialItem) => {
    if (!acc[vial.doseTypeId]) acc[vial.doseTypeId] = [];
    acc[vial.doseTypeId].push(vial);
    return acc;
  }, {});

  const toggleVial = (vialId: string) => {
    setSelectedVials((prev) =>
      prev.includes(vialId)
        ? prev.filter((id) => id !== vialId)
        : [...prev, vialId]
    );
  };

  const selectAllOfType = (doseTypeId: string) => {
    const vialsOfType = vialsByDoseType[doseTypeId]?.map((v: VialItem) => v.id) || [];
    const allSelected = vialsOfType.every((id: string) => selectedVials.includes(id));
    
    if (allSelected) {
      setSelectedVials((prev) => prev.filter((id) => !vialsOfType.includes(id)));
    } else {
      setSelectedVials((prev) => [...new Set([...prev, ...vialsOfType])]);
    }
  };

  const selectedVialData = vials.filter((v: VialItem) => selectedVials.includes(v.id));

  if (showPrintView) {
    return <PrintView vials={selectedVialData} onBack={() => setShowPrintView(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Print Labels</h1>
            <p className="text-sm text-muted-foreground">
              Print 3x3 label cards for your doses
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4" />
                Select Doses
              </CardTitle>
              <CardDescription>
                Choose up to 9 doses per page
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(vialsByDoseType).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No doses available. Create new doses first.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(vialsByDoseType).map(([doseTypeId, vialsInGroup]) => {
                    const doseType = doseTypes?.find((dt: { id: string }) => dt.id === doseTypeId);
                    const vialsArray = vialsInGroup as VialItem[];
                    const allSelected = vialsArray.every((v) => selectedVials.includes(v.id));
                    
                    return (
                      <div key={doseTypeId} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => selectAllOfType(doseTypeId)}
                            />
                            <span className="font-medium text-sm">{doseType?.name || "Unknown"}</span>
                            <Badge variant="outline" className="text-xs">
                              {doseType?.gramsPerDose}g
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {vialsArray.filter((v) => selectedVials.includes(v.id)).length}/{vialsArray.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vialsArray.map((vial) => (
                            <div
                              key={vial.id}
                              onClick={() => toggleVial(vial.id)}
                              className={`
                                px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors
                                ${selectedVials.includes(vial.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary/50 border-border hover:border-primary/50"
                                }
                              `}
                            >
                              {vial.vialCode}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedVials.length > 0 && (
            <Card className="border-primary/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">Selected</span>
                  <Badge>{selectedVials.length} dose(s)</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {Math.ceil(selectedVials.length / 9)} page(s) will be generated
                </p>
                <Button
                  onClick={() => setShowPrintView(true)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Printer className="size-4" />
                  Preview & Print
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintView({ vials, onBack }: { vials: VialItem[]; onBack: () => void }) {
  // Split into pages of 9
  const pages: VialItem[][] = [];
  for (let i = 0; i < vials.length; i += 9) {
    pages.push(vials.slice(i, i + 9));
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls - hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-background border-b border-border p-4 z-50 flex items-center justify-between">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {vials.length} label(s) on {pages.length} page(s)
          </span>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Print pages */}
      <div className="print:pt-0 pt-20">
        {pages.map((pageVials, pageIndex) => (
          <div
            key={pageIndex}
            className="print:page-break-after-always print:m-0 print:p-0 mx-auto p-8"
            style={{ width: "210mm", minHeight: "297mm" }}
          >
            <div className="grid grid-cols-3 gap-0 border border-gray-300 print:border-black">
              {/* Fill empty slots to always have 9 cards */}
              {Array.from({ length: 9 }).map((_, index) => {
                const vial = pageVials[index];
                return (
                  <div
                    key={index}
                    className="border border-gray-300 print:border-black aspect-square flex flex-col items-center justify-center p-4"
                    style={{ width: "70mm", height: "70mm" }}
                  >
                    {vial ? (
                      <>
                        <div className="bg-white p-2 rounded">
                          <QRCodeSVG value={getVialQRUrl(vial.vialCode)} size={100} />
                        </div>
                        <p className="mt-2 font-mono text-lg font-bold text-black">
                          {vial.vialCode}
                        </p>
                        <p className="text-xs text-gray-600">
                          {vial.doseTypeName} ({vial.gramsPerDose}g)
                        </p>
                        {vial.coffeeName && vial.status === "FULL" && (
                          <p className="mt-1 text-xs text-gray-800 font-medium text-center truncate max-w-full">
                            {vial.coffeeName}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-200 text-xs">Empty</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
