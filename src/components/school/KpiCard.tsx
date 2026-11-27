import { cn } from "@/utils";
import type React from "react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </span>
        {icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {value}
        </p>

        {trend ? (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
              trend.positive === false
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </div>

      {subtitle ? (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
