"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useCoffees, useVials } from "@/lib/hooks";
import { Search } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const { data: coffees } = useCoffees();
  const { data: vials } = useVials();
  const router = useRouter();

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const items: { type: string; label: string; sub: string; href: string }[] =
      [];

    if (coffees) {
      for (const c of coffees) {
        if (
          c.coffeeName.toLowerCase().includes(q) ||
          c.origin.toLowerCase().includes(q) ||
          c.roaster.toLowerCase().includes(q)
        ) {
          items.push({
            type: "coffee",
            label: c.coffeeName,
            sub: `${c.roaster} - ${c.origin}`,
            href: `/coffees/${c.id}`,
          });
        }
      }
    }

    if (vials) {
      for (const v of vials) {
        if (v.vialCode.toLowerCase().includes(q)) {
          items.push({
            type: "dose",
            label: v.vialCode,
            sub: v.status === "FULL" ? "Sealed" : "Brewed",
            href: `/vials/${v.id}`,
          });
        }
      }
    }

    return items.slice(0, 8);
  }, [query, coffees, vials]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search coffees, doses, origins..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-border bg-card shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery("");
                router.push(r.href);
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                {r.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.sub}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
