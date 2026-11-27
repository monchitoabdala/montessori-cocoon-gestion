"use client";

import { cn } from "@/utils";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface TableToolbarTab {
  key: string;
  label: string;
  count: number;
}

export interface TableToolbarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}

export interface TableToolbarProps {
  tabs?: TableToolbarTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filtersContent?: React.ReactNode;
  activeFiltersCount?: number;
  actions?: TableToolbarAction[];
  className?: string;
}

function IconSearch() {
  return (
    <svg
      className="size-4 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconSlidersHorizontal() {
  return (
    <svg
      className="size-3.5 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={cn(
        "size-3.5 text-gray-400 transition-transform",
        open && "rotate-180",
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TableToolbar({
  tabs = [],
  activeTab,
  onTabChange,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filtersContent,
  activeFiltersCount = 0,
  actions,
  className,
}: TableToolbarProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const filtersCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setActionsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (filtersCloseTimer.current) clearTimeout(filtersCloseTimer.current);
      if (actionsCloseTimer.current) clearTimeout(actionsCloseTimer.current);
    };
  }, []);

  const openFiltersNow = () => {
    if (filtersCloseTimer.current) {
      clearTimeout(filtersCloseTimer.current);
      filtersCloseTimer.current = null;
    }
    setFiltersOpen(true);
  };

  const closeFiltersDelayed = () => {
    if (filtersCloseTimer.current) clearTimeout(filtersCloseTimer.current);
    filtersCloseTimer.current = setTimeout(() => {
      setFiltersOpen(false);
    }, 150);
  };

  const openActionsNow = () => {
    if (actionsCloseTimer.current) {
      clearTimeout(actionsCloseTimer.current);
      actionsCloseTimer.current = null;
    }
    setActionsOpen(true);
  };

  const closeActionsDelayed = () => {
    if (actionsCloseTimer.current) clearTimeout(actionsCloseTimer.current);
    actionsCloseTimer.current = setTimeout(() => {
      setActionsOpen(false);
    }, 150);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 pt-2 pb-2 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {/* Left: Horizontal status/category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange?.(tab.key)}
              className={cn(
                "-mb-2 flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pt-1.5 pb-3 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-blue-600 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <span>{tab.label}</span>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Search + Filters + Actions */}
      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        {onSearchChange ? (
          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <IconSearch />
            </span>
            <input
              ref={searchRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
            />
          </div>
        ) : null}

        {filtersContent ? (
          <div
            ref={filtersRef}
            className="relative"
            onMouseEnter={openFiltersNow}
            onMouseLeave={closeFiltersDelayed}
          >
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <IconSlidersHorizontal />
              <span>Filtros</span>
              {activeFiltersCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                  {activeFiltersCount}
                </span>
              ) : null}
              <IconChevronDown open={filtersOpen} />
            </button>

            {filtersOpen ? (
              <div className="absolute right-0 z-30 mt-1.5 min-w-[260px] rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                {filtersContent}
              </div>
            ) : null}
          </div>
        ) : null}

        {actions && actions.length > 0 ? (
          <div
            ref={actionsRef}
            className="relative"
            onMouseEnter={openActionsNow}
            onMouseLeave={closeActionsDelayed}
          >
            <button
              type="button"
              onClick={() => setActionsOpen((prev) => !prev)}
              aria-expanded={actionsOpen}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span>Acciones</span>
              <IconChevronDown open={actionsOpen} />
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 z-30 mt-1.5 min-w-[220px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
                {(() => {
                  const hasAutomations = actions.some(
                    (a) => a.label.toLowerCase() === "automatizaciones",
                  );
                  const secondaryActions: TableToolbarAction[] = [
                    ...actions.filter((a) => !a.primary),
                    ...(hasAutomations
                      ? []
                      : [
                          {
                            label: "Automatizaciones",
                            icon: <IconZap />,
                            onClick: () =>
                              router.push("/admin/configuracion/automatizaciones"),
                          },
                        ]),
                  ];
                  const primaryActions = actions.filter((a) => a.primary);
                  return (
                    <>
                      {secondaryActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            action.onClick();
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          {action.icon ? (
                            <span className="shrink-0 text-gray-500">{action.icon}</span>
                          ) : null}
                          <span>{action.label}</span>
                        </button>
                      ))}
                      {secondaryActions.length > 0 && primaryActions.length > 0 ? (
                        <div className="my-1 border-t border-gray-100" />
                      ) : null}
                      {primaryActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            action.onClick();
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50/50"
                        >
                          {action.icon ? (
                            <span className="shrink-0">{action.icon}</span>
                          ) : null}
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
