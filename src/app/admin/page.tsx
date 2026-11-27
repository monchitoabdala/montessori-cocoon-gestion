"use client";

import { Avatar } from "@/components/school/Avatar";
import { KpiCard } from "@/components/school/KpiCard";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface GuardianRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  photoUrl?: string | null;
}

interface OverdueCharge {
  id: string;
  period: string;
  description: string;
  dueDate: string;
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
      name: string;
      grade: { name: string };
    } | null;
    guardians: Array<{
      isFinancialResponsible: boolean;
      guardian: GuardianRef;
    }>;
  };
}

interface RecentPayment {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  receiptNumber: string | null;
  paidAt: string;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
  } | null;
  allocations: Array<{
    id: string;
    amount: string | number;
    feeCharge: {
      id: string;
      period: string;
      description: string;
      student: {
        id: string;
        firstName: string;
        lastName: string;
        legajo: string;
        photoUrl?: string | null;
      };
    };
  }>;
}

interface DashboardData {
  period: string;
  totalBilledThisMonth: number;
  totalCollectedThisMonth: number;
  totalOverdue: number;
  collectionRate: number;
  activeStudentsCount: number;
  overdueCharges: OverdueCharge[];
  recentPayments: RecentPayment[];
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

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<string>(getCurrentPeriod);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedFeeId, setCopiedFeeId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{
    type: "overdue" | "payment";
    id: string;
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    function handleClose() {
      setOpenMenu(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [openMenu]);

  const loadDashboard = useCallback(async (targetPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard?period=${encodeURIComponent(targetPeriod)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al cargar el panel");
      }
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el panel",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(period);
  }, [loadDashboard, period]);

  async function handleCopyWhatsApp(charge: OverdueCharge) {
    const balance = Math.max(
      0,
      Number(charge.finalAmount) - Number(charge.paidAmount),
    );
    const guardian =
      charge.student.guardians.find((g) => g.isFinancialResponsible)?.guardian ??
      charge.student.guardians[0]?.guardian;
    const guardianName = guardian
      ? `${guardian.firstName} ${guardian.lastName}`
      : "Familia";
    const message = `Hola ${guardianName}, le recordamos que la cuota "${charge.description}" (${charge.period}) de ${charge.student.lastName}, ${charge.student.firstName} vencio el ${formatDateAR(charge.dueDate)}. Saldo pendiente: ${formatARS(balance)}.`;

    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback ignored if clipboard permission is unavailable
    }
    setCopiedFeeId(charge.id);
    setTimeout(() => {
      setCopiedFeeId((prev) => (prev === charge.id ? null : prev));
      setOpenMenu((prev) => (prev?.id === charge.id ? null : prev));
    }, 900);
  }

  async function handleSendNotification(
    feeChargeId: string,
    channel: "EMAIL" | "WHATSAPP",
  ) {
    setSendingId(`${feeChargeId}:${channel}`);
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
        setFeedback("Enlace de WhatsApp generado y registrado en historial.");
      } else {
        setFeedback(
          json.simulated
            ? "Email registrado en modo simulación (SMTP no configurado)."
            : "Recordatorio enviado por email correctamente.",
        );
      }
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Error al enviar notificación",
      );
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label
          htmlFor="dashboard-period"
          className="text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          Período
        </label>
        <input
          id="dashboard-period"
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
        <Link
          href="/admin/cuotas"
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ir a Cuotas y Caja
        </Link>
      </div>

      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Recaudación del mes"
          value={
            loading || !data ? "..." : formatARS(data.totalCollectedThisMonth)
          }
          subtitle={
            data
              ? `Facturado: ${formatARS(data.totalBilledThisMonth)}`
              : undefined
          }
          icon={
            <svg
              className="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          title="Morosidad total"
          value={loading || !data ? "..." : formatARS(data.totalOverdue)}
          subtitle={
            data
              ? `${data.overdueCharges.length} cuotas vencidas listadas`
              : undefined
          }
          icon={
            <svg
              className="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          }
        />
        <KpiCard
          title="Tasa de cobro"
          value={loading || !data ? "..." : `${data.collectionRate}%`}
          subtitle={`Período ${period}`}
          icon={
            <svg
              className="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          }
        />
        <KpiCard
          title="Alumnos activos"
          value={loading || !data ? "..." : data.activeStudentsCount}
          subtitle="Matrícula regular vigente"
          icon={
            <svg
              className="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Cuotas vencidas
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gestión rápida de reclamo por WhatsApp o Email.
            </p>
          </div>
          <Link
            href="/admin/cuotas?status=OVERDUE"
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Ver todas
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando cuotas vencidas...
                  </td>
                </tr>
              ) : !data || data.overdueCharges.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No hay cuotas vencidas registradas.
                  </td>
                </tr>
              ) : (
                data.overdueCharges.map((charge) => {
                  const balance = Math.max(
                    0,
                    Number(charge.finalAmount) - Number(charge.paidAmount),
                  );
                  return (
                    <tr
                      key={charge.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={charge.student.photoUrl}
                            name={`${charge.student.firstName} ${charge.student.lastName}`}
                            size="sm"
                          />
                          <div>
                            <Link
                              href={`/admin/alumnos/${charge.student.id}`}
                              className="hover:text-brand-600 hover:underline"
                            >
                              {charge.student.lastName},{" "}
                              {charge.student.firstName}
                            </Link>
                            <div className="text-xs font-normal text-gray-500">
                              Legajo {charge.student.legajo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {charge.student.division
                          ? `${charge.student.division.grade.name} ${charge.student.division.name}`
                          : "Sin asignar"}
                      </td>
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                        {charge.description}
                        <div className="text-xs text-gray-500">
                          {charge.period}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {formatDateAR(charge.dueDate)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatARS(balance)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={charge.status} category="fee" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              openMenu?.type === "overdue" &&
                              openMenu.id === charge.id
                            ) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 140;
                            const openUp =
                              rect.bottom + menuHeight > window.innerHeight;
                            setOpenMenu({
                              type: "overdue",
                              id: charge.id,
                              top: openUp
                                ? Math.max(8, rect.top - menuHeight)
                                : rect.bottom + 4,
                              right: Math.max(8, window.innerWidth - rect.right),
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

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Pagos recientes
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Últimos ingresos acreditados con acceso directo al comprobante PDF.
            </p>
          </div>
          <Link
            href="/admin/cuotas"
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Registrar cobro
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Recibo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Responsable</th>
                <th className="px-5 py-3">Medio</th>
                <th className="px-5 py-3 text-right">Importe</th>
                <th className="px-5 py-3 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando pagos recientes...
                  </td>
                </tr>
              ) : !data || data.recentPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Todavía no hay pagos acreditados.
                  </td>
                </tr>
              ) : (
                data.recentPayments.map((payment) => {
                  const firstAlloc = payment.allocations[0];
                  const student = firstAlloc?.feeCharge?.student;
                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {formatDateAR(payment.paidAt)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {payment.receiptNumber ?? "Sin número"}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        {student ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={student.photoUrl}
                              name={`${student.firstName} ${student.lastName}`}
                              size="sm"
                            />
                            <Link
                              href={`/admin/alumnos/${student.id}`}
                              className="hover:text-brand-600 hover:underline"
                            >
                              {student.lastName}, {student.firstName}
                            </Link>
                          </div>
                        ) : (
                          "Varios"
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {payment.guardian ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={payment.guardian.photoUrl}
                              name={`${payment.guardian.firstName} ${payment.guardian.lastName}`}
                              size="sm"
                            />
                            <span>
                              {payment.guardian.lastName},{" "}
                              {payment.guardian.firstName}
                            </span>
                          </div>
                        ) : (
                          "Caja"
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={payment.method}
                          category="paymentMethod"
                        />
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatARS(payment.amount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              openMenu?.type === "payment" &&
                              openMenu.id === payment.id
                            ) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 96;
                            const openUp =
                              rect.bottom + menuHeight > window.innerHeight;
                            setOpenMenu({
                              type: "payment",
                              id: payment.id,
                              top: openUp
                                ? Math.max(8, rect.top - menuHeight)
                                : rect.bottom + 4,
                              right: Math.max(8, window.innerWidth - rect.right),
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
      {openMenu && data && openMenu.type === "overdue" ? (
        (() => {
          const charge = data.overdueCharges.find((c) => c.id === openMenu.id);
          if (!charge) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <button
                type="button"
                onClick={() => void handleCopyWhatsApp(charge)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {copiedFeeId === charge.id ? (
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
                disabled={sendingId === `${charge.id}:WHATSAPP`}
                onClick={() => {
                  setOpenMenu(null);
                  void handleSendNotification(charge.id, "WHATSAPP");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Abrir WhatsApp
              </button>
              <button
                type="button"
                disabled={sendingId === `${charge.id}:EMAIL`}
                onClick={() => {
                  setOpenMenu(null);
                  void handleSendNotification(charge.id, "EMAIL");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Enviar Email
              </button>
            </div>
          );
        })()
      ) : null}

      {openMenu && data && openMenu.type === "payment" ? (
        (() => {
          const payment = data.recentPayments.find((p) => p.id === openMenu.id);
          if (!payment) return null;
          const student = payment.allocations[0]?.feeCharge?.student;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <a
                href={`/api/payments/${payment.id}/receipt`}
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
              {student ? (
                <Link
                  href={`/admin/alumnos/${student.id}`}
                  onClick={() => setOpenMenu(null)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Ver legajo
                </Link>
              ) : null}
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
