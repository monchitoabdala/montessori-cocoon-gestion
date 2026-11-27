"use client";

import { Avatar } from "@/components/school/Avatar";
import { GroupedSelect, type GroupedSelectGroup } from "@/components/school/GroupedSelect";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface LevelItem {
  id: string;
  name: string;
}

interface DivisionItem {
  id: string;
  name: string;
  grade: {
    name: string;
    level: { name: string };
  };
}

interface FeeItem {
  id: string;
  period: string;
  description: string;
  dueDate: string;
  baseAmount: string | number;
  discountAmount: string | number;
  lateFeeAmount: string | number;
  finalAmount: string | number;
  paidAmount: string | number;
  status: string;
  student: {
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    division: {
      id: string;
      name: string;
      grade: {
        name: string;
        level: { name: string };
      };
    } | null;
    guardians?: Array<{
      isFinancialResponsible: boolean;
      guardian: {
        firstName: string;
        lastName: string;
        photoUrl?: string | null;
      };
    }>;
  };
  allocations: Array<{
    id: string;
    payment: {
      id: string;
      status: string;
      receiptNumber: string | null;
    };
  }>;
}

function formatARS(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDateAR(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminCuotasPage() {
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);

  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [divisionId, setDivisionId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Generate fees modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genPeriod, setGenPeriod] = useState(getCurrentPeriod);
  const [genDueDate, setGenDueDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;
  });
  const [genLevelId, setGenLevelId] = useState("");
  const [genSiblingDiscount, setGenSiblingDiscount] = useState(true);
  const [submittingGen, setSubmittingGen] = useState(false);

  // Apply late fees
  const [applyingLateFees, setApplyingLateFees] = useState(false);

  // Register payment modal
  const [payFee, setPayFee] = useState<FeeItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "TRANSFER" | "CARD">(
    "CASH",
  );
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  const [sendingNotifId, setSendingNotifId] = useState<string | null>(null);
  const [copiedFeeId, setCopiedFeeId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!openMenu && !statusMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setStatusMenuOpen(false);
      }
    }
    function handleClose() {
      setOpenMenu(null);
      setStatusMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [openMenu, statusMenuOpen]);

  const loadStructure = useCallback(async () => {
    const res = await fetch("/api/structure", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setLevels(json.levels ?? []);
      setDivisions(json.divisions ?? []);
    }
  }, []);

  const loadFees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      if (statusFilter) params.set("status", statusFilter);
      if (divisionId) params.set("divisionId", divisionId);

      const res = await fetch(`/api/fees?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al listar cuotas");
      }
      setFees(json.fees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al listar cuotas");
    } finally {
      setLoading(false);
    }
  }, [divisionId, period, statusFilter]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  async function handleGenerateFees(e: FormEvent) {
    e.preventDefault();
    setSubmittingGen(true);
    setError(null);
    try {
      const res = await fetch("/api/fees/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: genPeriod,
          dueDate: genDueDate,
          levelId: genLevelId || undefined,
          applySiblingDiscount: genSiblingDiscount,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al generar cuotas");
      }
      setShowGenerateModal(false);
      setFeedback(
        `Período ${json.period}: ${json.createdCount} cuotas generadas, ${json.skippedCount} omitidas por duplicado.`,
      );
      await loadFees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al generar cuotas",
      );
    } finally {
      setSubmittingGen(false);
    }
  }

  async function handleApplyLateFees() {
    setApplyingLateFees(true);
    setError(null);
    try {
      const res = await fetch("/api/fees/apply-late-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al aplicar mora");
      }
      setFeedback(
        `Mora aplicada: ${json.updatedCount} cuotas actualizadas (${json.surchargePercent}% de recargo).`,
      );
      await loadFees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar mora");
    } finally {
      setApplyingLateFees(false);
    }
  }

  function openPayModal(fee: FeeItem) {
    const balance = Math.max(
      0,
      Number(fee.finalAmount) - Number(fee.paidAmount),
    );
    setPayFee(fee);
    setPayAmount(String(balance));
    setPayMethod("CASH");
    setPayNotes("");
  }

  async function handleRegisterPayment(e: FormEvent) {
    e.preventDefault();
    if (!payFee) return;
    setSubmittingPay(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeChargeId: payFee.id,
          amount: Number(payAmount),
          method: payMethod,
          notes: payNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al registrar el pago");
      }
      setPayFee(null);
      setFeedback(
        `Cobro registrado en caja. Recibo ${json.payment?.receiptNumber ?? "emitido"}.`,
      );
      await loadFees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar el pago",
      );
    } finally {
      setSubmittingPay(false);
    }
  }

  async function handleCopyWhatsApp(fee: FeeItem) {
    const balance = Math.max(
      0,
      Number(fee.finalAmount) - Number(fee.paidAmount),
    );
    const guardian =
      fee.student.guardians?.find((g) => g.isFinancialResponsible)?.guardian ??
      fee.student.guardians?.[0]?.guardian;
    const guardianName = guardian
      ? `${guardian.firstName} ${guardian.lastName}`
      : "Familia";
    const message = `Hola ${guardianName}, le recordamos que la cuota "${fee.description}" (${fee.period}) de ${fee.student.lastName}, ${fee.student.firstName} vencio el ${formatDateAR(fee.dueDate)}. Saldo pendiente: ${formatARS(balance)}.`;

    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback ignored if clipboard permission is unavailable
    }
    setCopiedFeeId(fee.id);
    setTimeout(() => {
      setCopiedFeeId((prev) => (prev === fee.id ? null : prev));
      setOpenMenu((prev) => (prev?.id === fee.id ? null : prev));
    }, 900);
  }

  async function handleSendNotification(
    feeChargeId: string,
    channel: "EMAIL" | "WHATSAPP",
  ) {
    setSendingNotifId(`${feeChargeId}:${channel}`);
    setFeedback(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeChargeId, channel }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar la notificación");
      }
      if (channel === "WHATSAPP" && json.whatsappUrl) {
        window.open(json.whatsappUrl, "_blank", "noopener,noreferrer");
        setFeedback("Enlace de WhatsApp abierto y registrado.");
      } else {
        setFeedback(
          json.simulated
            ? "Email registrado en modo simulación."
            : "Recordatorio enviado por email.",
        );
      }
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Error al enviar recordatorio",
      );
    } finally {
      setSendingNotifId(null);
    }
  }

  const divisionGroups = useMemo<GroupedSelectGroup[]>(() => {
    const map = new Map<string, GroupedSelectGroup>();
    for (const d of divisions) {
      const levelName = d.grade.level.name;
      if (!map.has(levelName)) {
        map.set(levelName, { label: levelName, options: [] });
      }
      map.get(levelName)!.options.push({
        value: d.id,
        label: `${d.grade.name} ${d.name}`,
      });
    }
    return Array.from(map.values());
  }, [divisions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Período
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Estado
            </label>
            {(() => {
              const FEE_STATUS_OPTIONS = [
                { value: "", label: "Todos" },
                { value: "PENDING", label: "Pendiente" },
                { value: "OVERDUE", label: "Vencida" },
                { value: "PARTIAL", label: "Parcial" },
                { value: "PAID", label: "Pagada" },
                { value: "CANCELLED", label: "Anulada" },
              ];
              const current =
                FEE_STATUS_OPTIONS.find((o) => o.value === statusFilter) ??
                FEE_STATUS_OPTIONS[0];
              return (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusMenuOpen((prev) => !prev);
                    }}
                    className="flex min-h-[38px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <span className="flex items-center">
                      {current.value ? (
                        <StatusBadge status={current.value} category="fee" />
                      ) : (
                        <span>{current.label}</span>
                      )}
                    </span>
                    <svg
                      className="size-4 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {statusMenuOpen ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      {FEE_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value || "ALL"}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setStatusMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            statusFilter === opt.value
                              ? "bg-gray-50 font-medium text-gray-900 dark:bg-gray-800/60 dark:text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span>
                            {opt.value ? (
                              <StatusBadge status={opt.value} category="fee" />
                            ) : (
                              <span>{opt.label}</span>
                            )}
                          </span>
                          {statusFilter === opt.value ? (
                            <svg
                              className="size-3.5 text-brand-600"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              División
            </label>
            <GroupedSelect
              value={divisionId}
              onChange={setDivisionId}
              groups={divisionGroups}
              allLabel="Todas"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={applyingLateFees}
            onClick={() => void handleApplyLateFees()}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {applyingLateFees ? "Aplicando..." : "Aplicar Mora"}
          </button>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Generar Cuotas del Mes
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Tutor</th>
                <th className="px-5 py-3">Período / Concepto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-right">Final</th>
                <th className="px-5 py-3 text-right">Pagado</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando cuotas...
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron cuotas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                fees.map((fee) => {
                  const balance = Math.max(
                    0,
                    Number(fee.finalAmount) - Number(fee.paidAmount),
                  );
                  const completedPayment = fee.allocations.find(
                    (a) => a.payment.status === "COMPLETED",
                  )?.payment;
                  const mainGuardian =
                    fee.student.guardians?.find((g) => g.isFinancialResponsible)
                      ?.guardian ?? fee.student.guardians?.[0]?.guardian;

                  return (
                    <tr
                      key={fee.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={fee.student.photoUrl}
                            name={`${fee.student.firstName} ${fee.student.lastName}`}
                            size="sm"
                          />
                          <div>
                            <Link
                              href={`/admin/alumnos/${fee.student.id}`}
                              className="hover:text-brand-600 hover:underline"
                            >
                              {fee.student.lastName}, {fee.student.firstName}
                            </Link>
                            <div className="text-xs font-normal text-gray-500">
                              {fee.student.division
                                ? `${fee.student.division.grade.name} ${fee.student.division.name}`
                                : "Sin división"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {mainGuardian ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={mainGuardian.photoUrl}
                              name={`${mainGuardian.firstName} ${mainGuardian.lastName}`}
                              size="sm"
                            />
                            <span>
                              {mainGuardian.lastName}, {mainGuardian.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin tutor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                        <div>{fee.description}</div>
                        <div className="text-xs text-gray-500">
                          {fee.period}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {formatDateAR(fee.dueDate)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatARS(fee.finalAmount)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatARS(fee.paidAmount)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatARS(balance)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={fee.status} category="fee" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenu?.id === fee.id) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const menuHeight = 200;
                            const openUp =
                              rect.bottom + menuHeight > window.innerHeight;
                            setOpenMenu({
                              id: fee.id,
                              top: openUp
                                ? Math.max(8, rect.top - menuHeight)
                                : rect.bottom + 4,
                              right: Math.max(
                                8,
                                window.innerWidth - rect.right,
                              ),
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showGenerateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generar Cuotas del Mes
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Emite cuotas mensuales para alumnos activos aplicando becas y
              descuentos por hermanos.
            </p>

            <form onSubmit={handleGenerateFees} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Período (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  required
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Nivel (opcional)
                </label>
                <select
                  value={genLevelId}
                  onChange={(e) => setGenLevelId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Todos los niveles</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={genSiblingDiscount}
                  onChange={(e) => setGenSiblingDiscount(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                Aplicar descuento automático por hermanos
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingGen}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingGen ? "Generando..." : "Generar Cuotas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {payFee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Registrar Pago en Caja
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {payFee.student.lastName}, {payFee.student.firstName} ·{" "}
              {payFee.description} ({payFee.period})
            </p>

            <form onSubmit={handleRegisterPayment} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Importe (ARS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Medio de pago
                </label>
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(
                      e.target.value as "CASH" | "TRANSFER" | "CARD",
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Observaciones (opcional)
                </label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayFee(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingPay ? "Guardando..." : "Confirmar Cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {openMenu ? (
        (() => {
          const fee = fees.find((f) => f.id === openMenu.id);
          if (!fee) return null;
          const balance = Math.max(
            0,
            Number(fee.finalAmount) - Number(fee.paidAmount),
          );
          const completedPayment = fee.allocations.find(
            (a) => a.payment.status === "COMPLETED",
          )?.payment;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {balance > 0 && fee.status !== "CANCELLED" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      openPayModal(fee);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                    Cobrar en caja
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyWhatsApp(fee)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {copiedFeeId === fee.id ? (
                      <>
                        <svg className="size-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        Copiar WhatsApp
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={sendingNotifId === `${fee.id}:EMAIL`}
                    onClick={() => {
                      setOpenMenu(null);
                      void handleSendNotification(fee.id, "EMAIL");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Enviar Email
                  </button>
                  <button
                    type="button"
                    disabled={sendingNotifId === `${fee.id}:WHATSAPP`}
                    onClick={() => {
                      setOpenMenu(null);
                      void handleSendNotification(fee.id, "WHATSAPP");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Abrir WhatsApp
                  </button>
                </>
              ) : null}
              {completedPayment ? (
                <a
                  href={`/api/payments/${completedPayment.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenMenu(null)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                  Descargar Recibo PDF
                </a>
              ) : null}
              <Link
                href={`/admin/alumnos/${fee.student.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver legajo
              </Link>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
