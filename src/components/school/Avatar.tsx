"use client";

import { cn } from "@/utils";
import { useState } from "react";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

const FALLBACK_PALETTES = [
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getPaletteForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[index];
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={cn(
          "shrink-0 rounded-full border border-gray-200 bg-gray-100 object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      title={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border font-semibold select-none",
        sizeClass,
        getPaletteForName(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
