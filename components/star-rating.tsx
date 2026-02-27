"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  const displayValue = hoverValue ?? value;

  return (
    <div
      className={cn("flex items-center gap-0.5", !readonly && "cursor-pointer")}
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-colors",
            readonly && "cursor-default"
          )}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              star <= displayValue
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}
