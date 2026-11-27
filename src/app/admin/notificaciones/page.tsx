"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface NotificationSummaryItem {
  id: string;
  title: string;
  subtitle: string;
  category: "OVERDUE" | "LEAVE" | "FEE";
  href: string;
  date: string;
}

interface NotifState {
  readIds: string[];
  clearedIds: string[];
}

const STORAGE_KEY = "cocoon_notif_state";

function loadNotifState(): NotifState {
  if (typeof window === "undefined") {
    return { readIds: [], clearedIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { readIds: [], clearedIds: [] };
    const parsed = JSON.parse(raw) as Partial<NotifState>;
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      clearedIds: Array.isArray(parsed.clearedIds) ? parsed.clearedIds : [],
    };
  } catch {
    return { readIds: [], clearedIds: [] };
  }
}

function saveNotifState(state: NotifState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function formatDateAR(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const CATEGORY_META: Record<
  NotificationSummaryItem["category"],
  { label: string; dot: string; badge: string }
> = {
  OVERDUE: {
    label: "Cuota vencida",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-700",
  },
  LEAVE: {
    label: "Licencia / Vacaciones",
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  FEE: {
    label: "Notificación de cuota",
    dot: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export default function AdminNotificacionesPage() {
  const [items, setItems] = useState<NotificationSummaryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "UNREAD" | "FEES" | "LEAVES"
  >("ALL");
  const [notifState, setNotifState] = useState<NotifState>({
    readIds: [],
    clearedIds: [],
  });

  useEffect(() => {
    setNotifState(loadNotifState());
  }, []);

  const fetchNotifications = useCallback(
    async (offsetVal: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(
          `/api/notifications?summary=true&limit=20&offset=${offsetVal}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Error al cargar notificaciones");
        }
        const incoming: NotificationSummaryItem[] = json.items ?? [];
        setItems((prev) => (append ? [...prev, ...incoming] : incoming));
        setHasMore(Boolean(json.hasMore));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar notificaciones",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchNotifications(0, false);
  }, [fetchNotifications]);

  function updateState(updater: (prev: NotifState) => NotifState) {
    setNotifState((prev) => {
      const next = updater(prev);
      saveNotifState(next);
      return next;
    });
  }

  function markAsRead(id: string) {
    updateState((prev) =>
      prev.readIds.includes(id)
        ? prev
        : { ...prev, readIds: [...prev.readIds, id] },
    );
  }

  function markAllAsRead() {
    updateState((prev) => ({
      ...prev,
      readIds: Array.from(new Set([...prev.readIds, ...items.map((i) => i.id)])),
    }));
  }

  function clearRead() {
    updateState((prev) => ({
      ...prev,
      clearedIds: Array.from(new Set([...prev.clearedIds, ...prev.readIds])),
    }));
  }

  const nonClearedItems = useMemo(
    () => items.filter((item) => !notifState.clearedIds.includes(item.id)),
    [items, notifState.clearedIds],
  );

  const visibleItems = useMemo(() => {
    return nonClearedItems.filter((item) => {
      if (activeTab === "UNREAD") {
        return !notifState.readIds.includes(item.id);
      }
      if (activeTab === "FEES") {
        return item.category === "OVERDUE" || item.category === "FEE";
      }
      if (activeTab === "LEAVES") {
        return item.category === "LEAVE";
      }
      return true;
    });
  }, [activeTab, nonClearedItems, notifState.readIds]);

  const tabs = [
    { key: "ALL" as const, label: "Todas", count: nonClearedItems.length },
    {
      key: "UNREAD" as const,
      label: "No leídas",
      count: nonClearedItems.filter((i) => !notifState.readIds.includes(i.id))
        .length,
    },
    {
      key: "FEES" as const,
      label: "Cuotas",
      count: nonClearedItems.filter(
        (i) => i.category === "OVERDUE" || i.category === "FEE",
      ).length,
    },
    {
      key: "LEAVES" as const,
      label: "Vacaciones",
      count: nonClearedItems.filter((i) => i.category === "LEAVE").length,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? "rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-900"
                    : "rounded-lg bg-transparent px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={
                    isActive
                      ? "rounded-full border border-gray-200/80 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-700"
                      : "rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500"
                  }
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Marcar todas como leídas
          </button>
          <button
            type="button"
            onClick={clearRead}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar leídas
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Cargando notificaciones...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay notificaciones para mostrar.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleItems.map((item) => {
              const isRead = notifState.readIds.includes(item.id);
              const meta = CATEGORY_META[item.category];
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    isRead ? "bg-gray-50/50 opacity-75" : "bg-white"
                  }`}
                >
                  <Link
                    href={item.href}
                    onClick={() => markAsRead(item.id)}
                    className="flex min-w-0 flex-1 items-start gap-3"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        isRead ? "bg-gray-300" : meta.dot
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {item.subtitle}
                      </p>
                      <span className="mt-1 inline-block text-[11px] text-gray-400">
                        {formatDateAR(item.date)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    {!isRead ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Marcar leída
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Leída</span>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => markAsRead(item.id)}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Ir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore ? (
          <div className="border-t border-gray-100 px-5 py-3 text-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void fetchNotifications(items.length, true)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
