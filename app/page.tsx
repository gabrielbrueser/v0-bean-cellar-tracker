"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";
import { InventorySummary } from "@/components/inventory-summary";
import { SearchBar } from "@/components/search-bar";


export default function HomePage() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = useCallback(
    async (value: string) => {
      try {
        const res = await fetch(
          `/api/vials/lookup?qr=${encodeURIComponent(value)}`
        );
        const vial = await res.json();
        if (vial) {
          router.push(`/vials/${vial.id}`);
        } else {
          toast.error("Dose not found", {
            description: "This QR code doesn't match any known dose.",
          });
          setShowScanner(false);
        }
      } catch {
        toast.error("Error scanning QR code");
        setShowScanner(false);
      }
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Bean Cellar
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your specialty coffee inventory
        </p>
      </header>

      <section className="mb-6" aria-label="QR Scanner">
        {showScanner ? (
          <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        ) : (
          <button
            onClick={() => setShowScanner(true)}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground text-base font-semibold transition-colors hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" x2="17" y1="12" y2="12" />
            </svg>
            Scan QR Code
          </button>
        )}
      </section>

      <section className="mb-6" aria-label="Search">
        <SearchBar />
      </section>

      <section aria-label="Inventory summary">
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Inventory
        </h2>
        <InventorySummary />
      </section>
    </div>
  );
}
