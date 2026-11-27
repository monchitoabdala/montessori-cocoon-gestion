"use client";

import { KpiCard } from "@/components/school/KpiCard";
import { StatusBadge } from "@/components/school/StatusBadge";
import { cn } from "@/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function IconUsers({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCreditCard({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
function IconReceipt({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M14 8H8M16 12H8M13 16H8" />
    </svg>
  );
}
function IconGraduation({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
function IconCheckCircle({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconAlertCircle({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
function IconRefresh({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
function IconArrowRight({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function IconFileDown({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M12 18v-6M9 15l3 3 3-3" />
    </svg>
  );
}

interface StudentSummary {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  dni: string;
  status: string;
  photoUrl?: string | null;
  bloodType?: string | null;
  allergiesNotes?: string | null;
  division: {
    id: string;
    name: string;
    grade: {
      id: string;
      name: string;
      level: { id: string; name: string };
    };
  } | null;
  scholarships?: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
  }>;
}

function StudentAvatar({
  photoUrl,
  firstName,
  lastName,
}: {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        onError={() => setImgError(true)}
        className="size-11 shrink-0 rounded-full border border-gray-200 bg-gray-50 object-cover"
      />
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-700">
      {initials}
    </div>
  );
}

interface FeeChargeItem {
  id: string;
  type: string;
  period: string;
  description: string;
  baseAmount: string | number;
  discountAmount: string | number;
  lateFeeAmount: string | number;
  finalAmount: string | number;
  paidAmount: string | number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "PARTIAL" | "CANCELLED";
  student: {
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
  };
}

interface PaymentItem {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  receiptNumber: string | null;
  paidAt: string;
  notes: string | null;
  allocations: Array<{
    amount: string | number;
    feeCharge: {
      id: string;
      period: string;
      description: string;
      student: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface SimulatedCheckoutState {
  feeChargeId: string;
  description: string;
  studentName: string;
  preferenceId: string;
  amount: number;
}

function formatArs(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function PortalHomeContent() {
  const searchParams = useSearchParams();
  const mpReturnStatus = searchParams.get("mp");

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [fees, setFees] = useState<FeeChargeItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [feeFilter, setFeeFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);
  const [simCheckout, setSimCheckout] = useState<SimulatedCheckoutState | null>(
    null,
  );
  const [confirmingSim, setConfirmingSim] = useState(false);

  const loadPortalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, feesRes, paymentsRes] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/fees", { cache: "no-store" }),
        fetch("/api/payments?limit=30", { cache: "no-store" }),
      ]);

      const [studentsJson, feesJson, paymentsJson] = await Promise.all([
        studentsRes.json(),
        feesRes.json(),
        paymentsRes.json(),
      ]);

      if (!studentsRes.ok) {
        throw new Error(studentsJson?.error || "Error al cargar alumnos");
      }
      if (!feesRes.ok) {
        throw new Error(feesJson?.error || "Error al cargar cuotas");
      }
      if (!paymentsRes.ok) {
        throw new Error(paymentsJson?.error || "Error al cargar pagos");
      }

      setStudents(studentsJson.students ?? []);
      setFees(feesJson.fees ?? []);
      setPayments(paymentsJson.payments ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la informacion del portal",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPortalData();
  }, [loadPortalData]);

  const metrics = useMemo(() => {
    let pendingBalance = 0;
    let overdueCount = 0;
    for (const fee of fees) {
      if (
        fee.status === "PENDING" ||
        fee.status === "OVERDUE" ||
        fee.status === "PARTIAL"
      ) {
        const remaining = Math.max(
          0,
          Number(fee.finalAmount) - Number(fee.paidAmount),
        );
        pendingBalance += remaining;
        if (fee.status === "OVERDUE") overdueCount += 1;
      }
    }
    return {
      childrenCount: students.length,
      pendingBalance,
      overdueCount,
      paymentsCount: payments.length,
    };
  }, [students, fees, payments]);

  const filteredFees = useMemo(() => {
    if (feeFilter === "PENDING") {
      return fees.filter(
        (f) =>
          f.status === "PENDING" ||
          f.status === "OVERDUE" ||
          f.status === "PARTIAL",
      );
    }
    if (feeFilter === "PAID") {
      return fees.filter((f) => f.status === "PAID");
    }
    return fees;
  }, [fees, feeFilter]);

  async function handleStartMercadoPago(fee: FeeChargeItem) {
    setPayingFeeId(fee.id);
    setError(null);
    setActionMsg(null);
    try {
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeChargeId: fee.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || "No se pudo iniciar el pago con Mercado Pago",
        );
      }

      if (json.simulated) {
        setSimCheckout({
          feeChargeId: fee.id,
          description: fee.description,
          studentName: `${fee.student.lastName}, ${fee.student.firstName}`,
          preferenceId: json.preferenceId,
          amount: Number(json.amount),
        });
      } else if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al iniciar checkout de Mercado Pago",
      );
    } finally {
      setPayingFeeId(null);
    }
  }

  async function handleConfirmSimulatedPayment() {
    if (!simCheckout) return;
    setConfirmingSim(true);
    setError(null);
    try {
      const res = await fetch("/api/mercadopago/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulated: true,
          feeChargeId: simCheckout.feeChargeId,
          preferenceId: simCheckout.preferenceId,
          amount: simCheckout.amount,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || "No se pudo confirmar el pago simulado",
        );
      }
      setActionMsg(
        `Pago acreditado correctamente (${simCheckout.description}) por ${formatArs(simCheckout.amount)}. Ya podes descargar tu recibo PDF.`,
      );
      setSimCheckout(null);
      await loadPortalData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al confirmar el pago simulado",
      );
    } finally {
      setConfirmingSim(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/portal/academico"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <IconGraduation className="size-4" />
          Ver asistencia y boletin
        </Link>
      </div>

      {mpReturnStatus === "success" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <IconCheckCircle className="size-4 shrink-0" />
          Tu pago fue aprobado por Mercado Pago. El estado de la cuota se actualizara en segundos.
        </div>
      ) : null}

      {mpReturnStatus === "failure" ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <IconAlertCircle className="size-4 shrink-0" />
          El pago en Mercado Pago no pudo completarse. Podes intentarlo nuevamente.
        </div>
      ) : null}

      {actionMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <IconCheckCircle className="size-4 shrink-0" />
          {actionMsg}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadPortalData()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-200"
          >
            <IconRefresh className="size-3.5" />
            Reintentar
          </button>
        </div>
      ) : null}

      {simCheckout ? (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-5 dark:border-sky-500/40 dark:bg-sky-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Simulacion local de Mercado Pago
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                {simCheckout.description} · {simCheckout.studentName}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Monto a abonar:{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatArs(simCheckout.amount)}
                </span>{" "}
                (Referencia: {simCheckout.preferenceId})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSimCheckout(null)}
                disabled={confirmingSim}
                className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSimulatedPayment()}
                disabled={confirmingSim}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <IconCreditCard className="size-4" />
                {confirmingSim
                  ? "Procesando..."
                  : "Confirmar pago simulado"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Alumnos vinculados"
          value={loading ? "..." : metrics.childrenCount}
          icon={<IconUsers className="size-4" />}
        />
        <KpiCard
          title="Saldo pendiente total"
          value={loading ? "..." : formatArs(metrics.pendingBalance)}
          subtitle={
            metrics.overdueCount > 0
              ? `${metrics.overdueCount} cuota(s) vencida(s)`
              : "Sin cuotas vencidas"
          }
          icon={<IconCreditCard className="size-4" />}
        />
        <KpiCard
          title="Pagos registrados"
          value={loading ? "..." : metrics.paymentsCount}
          subtitle="Comprobantes disponibles en PDF"
          icon={<IconReceipt className="size-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Mis Hijos
        </h2>

        {loading ? (
          <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            No hay alumnos vinculados a tu cuenta.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {students.map((st) => (
              <div
                key={st.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <StudentAvatar
                      photoUrl={st.photoUrl}
                      firstName={st.firstName}
                      lastName={st.lastName}
                    />
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {st.lastName}, {st.firstName}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Legajo {st.legajo} · DNI {st.dni}
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {st.division
                          ? `${st.division.grade.level.name} · ${st.division.grade.name} ${st.division.name}`
                          : "Sin division asignada"}
                      </p>
                      {st.allergiesNotes ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {st.allergiesNotes}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={st.status} category="student" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {st.scholarships && st.scholarships.length > 0
                      ? `Beca activa: ${st.scholarships[0].name}`
                      : "Sin beca aplicada"}
                  </span>
                  <Link
                    href={`/portal/academico?studentId=${encodeURIComponent(st.id)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    Ver boletin y asistencia
                    <IconArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Cuotas y Aranceles
          </h2>
          <div className="flex items-center gap-1.5">
            {(
              [
                { key: "ALL", label: "Todas" },
                { key: "PENDING", label: "Pendientes" },
                { key: "PAID", label: "Pagadas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFeeFilter(tab.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  feeFilter === tab.key
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Cargando cuotas...
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No hay cuotas para mostrar con el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Alumno</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredFees.map((fee) => {
                    const remaining = Math.max(
                      0,
                      Number(fee.finalAmount) - Number(fee.paidAmount),
                    );
                    const canPay =
                      remaining > 0 &&
                      (fee.status === "PENDING" ||
                        fee.status === "OVERDUE" ||
                        fee.status === "PARTIAL");

                    return (
                      <tr
                        key={fee.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {fee.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Periodo {fee.period}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">
                          {fee.student.lastName}, {fee.student.firstName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatDate(fee.dueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatArs(fee.finalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatArs(remaining)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={fee.status} category="fee" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {canPay ? (
                            <button
                              type="button"
                              onClick={() => void handleStartMercadoPago(fee)}
                              disabled={payingFeeId === fee.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                            >
                              <IconCreditCard className="size-3.5" />
                              {payingFeeId === fee.id
                                ? "Iniciando..."
                                : "Pagar con Mercado Pago"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Sin saldo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Historial de Pagos y Recibos
        </h2>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Cargando pagos...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Todavia no registras pagos en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Recibo</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                    <th className="px-4 py-3 font-medium">Medio</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3 text-right font-medium">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {payments.map((pay) => {
                    const firstAlloc = pay.allocations?.[0]?.feeCharge;
                    return (
                      <tr
                        key={pay.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatDate(pay.paidAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {pay.receiptNumber || "S/N"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {firstAlloc?.description ?? "Pago de arancel"}
                          </div>
                          {firstAlloc?.student ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {firstAlloc.student.lastName},{" "}
                              {firstAlloc.student.firstName}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={pay.method}
                            category="paymentMethod"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={pay.status}
                            category="paymentStatus"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatArs(pay.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <a
                            href={`/api/payments/${encodeURIComponent(pay.id)}/receipt`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                          >
                            <IconFileDown className="size-3.5" />
                            Recibo PDF
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PortalHomePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Cargando portal de familias...
        </div>
      }
    >
      <PortalHomeContent />
    </Suspense>
  );
}
