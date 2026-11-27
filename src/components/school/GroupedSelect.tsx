"use client";

import { cn } from "@/utils";
import { useEffect, useRef, useState } from "react";

export interface GroupedSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface GroupedSelectGroup {
  label: string;
  options: GroupedSelectOption[];
}

export interface GroupedSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: GroupedSelectGroup[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export function GroupedSelect({
  value,
  onChange,
  groups,
  placeholder = "Seleccionar...",
  allLabel,
  className,
}: GroupedSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  let selectedLabel = allLabel ?? placeholder;
  if (value !== "") {
    for (const group of groups) {
      const found = group.options.find((opt) => opt.value === value);
      if (found) {
        selectedLabel = found.label;
        break;
      }
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50 focus:border-brand-300 focus:outline-none"
      >
        <span className={cn("truncate", value === "" && !allLabel ? "text-gray-400" : "text-gray-800")}>
          {selectedLabel}
        </span>
        <svg
          className={cn("size-4 shrink-0 text-gray-400 transition-transform", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 left-0 z-40 mt-1.5 max-h-72 min-w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {allLabel ? (
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
                value === "" ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700",
              )}
            >
              <span>{allLabel}</span>
              {value === "" ? (
                <svg className="size-3.5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </button>
          ) : null}

          {groups.map((group, groupIndex) => {
            if (group.options.length === 0) return null;
            return (
              <div
                key={group.label}
                className={cn(
                  (allLabel || groupIndex > 0) && "mt-1 border-t border-gray-100 pt-1",
                )}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.label}
                </div>
                {group.options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-50",
                        isSelected ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.description ? (
                        <span className="shrink-0 text-xs text-gray-400">
                          {option.description}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
