"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Clock, Coffee, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/seal", label: "Seal", icon: Plus, highlight: true },
  { href: "/brew", label: "Brew", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          
          // Special styling for the Seal button
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2 px-3"
                aria-current={isActive ? "page" : undefined}
              >
                <div className={cn(
                  "flex items-center justify-center size-10 rounded-full -mt-4 shadow-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/90 text-primary-foreground hover:bg-primary"
                )}>
                  <item.icon className="size-5" />
                </div>
                <span className={cn(
                  "text-xs",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
