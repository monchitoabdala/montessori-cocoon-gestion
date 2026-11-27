"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface StudentDetail {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  status: string;
  observations: string | null;
  photoUrl: string | null;
  address: string | null;
  bloodType: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  allergiesNotes: string | null;
  division: {
    id: string;
    name: string;
    grade: {
      name: string;
      level: { name: string };
    };
  } | null;
  guardians: Array<{
    id: string;
    relationship: string;
    isFinancialResponsible: boolean;
    guardian: {
      id: string;
      firstName: string;
      lastName: string;
      dni: string;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      address: string | null;
      photoUrl?: string | null;
    };
  }>;
  scholarships: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
    notes: string | null;
    academicYear: { year: number; name: string } | null;
  }>;
  feeCharges: Array<{
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
    allocations: Array<{
      id: string;
      amount: string | number;
      payment: {
        id: string;
        method: string;
        status: string;
        receiptNumber: string | null;
        paidAt: string;
      };
    }>;
  }>;
  attendances: Array<{
    id: string;
    date: string;
    status: string;
    observations: string | null;
  }>;
  gradeRecords: Array<{
    id: string;
    term: string;
    score: string | number;
    observations: string | null;
    subject: {
      id: string;
      name: string;
      code: string | null;
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

function StudentAvatarLarge({
  photoUrl,
  firstName,
  lastName,
}: {
  photoUrl: string | null;
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
        className="size-14 shrink-0 rounded-full border border-gray-200 bg-gray-100 object-cover"
      />
    );
  }

  return (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-base font-semibold text-gray-600">
      {initials}
    </div>
  );
}

export default function AdminAlumnoDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [payCharge, setPayCharge] = useState<
    StudentDetail["feeCharges"][number] | null
  >(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "TRANSFER" | "CARD">(
    "CASH",
  );
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [copiedFeeId, setCopiedFeeId] = useState<string | null>(null);
  const [sendingNotifId, setSendingNotifId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{
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

  const loadStudent = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo cargar el legajo");
      }
      setStudent(json.student);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el legajo",
      );
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  async function handleCopyWhatsApp(fee: StudentDetail["feeCharges"][number]) {
    if (!student) return;
    const balance = Math.max(
      0,
      Number(fee.finalAmount) - Number(fee.paidAmount),
    );
    const guardian =
      student.guardians.find((g) => g.isFinancialResponsible)?.guardian ??
      student.guardians[0]?.guardian;
    const guardianName = guardian
      ? `${guardian.firstName} ${guardian.lastName}`
      : "Familia";
    const message = `Hola ${guardianName}, le recordamos que la cuota "${fee.description}" (${fee.period}) de ${student.lastName}, ${student.firstName} vencio el ${formatDateAR(fee.dueDate)}. Saldo pendiente: ${formatARS(balance)}.`;

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

  async function handleSendEmail(feeChargeId: string) {
    setSendingNotifId(feeChargeId);
    setFeedback(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeChargeId, channel: "EMAIL" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar el email");
      }
      setFeedback(
        json.simulated
          ? "Email registrado en modo simulación."
          : "Recordatorio enviado por email.",
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Error al enviar email",
      );
    } finally {
      setSendingNotifId(null);
    }
  }

  function openPayModal(charge: StudentDetail["feeCharges"][number]) {
    const balance = Math.max(
      0,
      Number(charge.finalAmount) - Number(charge.paidAmount),
    );
    setPayCharge(charge);
    setPayAmount(String(balance));
    setPayMethod("CASH");
    setPayNotes("");
  }

  async function handleSubmitPayment(e: FormEvent) {
    e.preventDefault();
    if (!payCharge) return;
    setSubmittingPay(true);
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeChargeId: payCharge.id,
          amount: Number(payAmount),
          method: payMethod,
          notes: payNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo registrar el pago");
      }

      setPayCharge(null);
      setFeedback(
        `Pago registrado. Recibo ${json.payment?.receiptNumber ?? "generado"}.`,
      );
      await loadStudent();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar el pago",
      );
    } finally {
      setSubmittingPay(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
        Cargando legajo del alumno...
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/alumnos"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Volver al listado de alumnos
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!student) return null;

  const attendanceCounts = student.attendances.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            src={student.photoUrl}
            name={`${student.firstName} ${student.lastName}`}
            size="lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {student.lastName}, {student.firstName}
              </span>
              <StatusBadge status={student.status} category="student" />
            </div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Legajo {student.legajo} · DNI {student.dni} · Nacimiento{" "}
              {formatDateAR(student.birthDate)} ·{" "}
              {student.division
                ? `${student.division.grade.level.name} - ${student.division.grade.name} ${student.division.name}`
                : "Sin división asignada"}
            </div>
          </div>
        </div>
        <Link
          href="/admin/alumnos"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          Volver a Alumnos
        </Link>
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

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
          Datos de Contacto y Ficha Médica
        </h2>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500">Domicilio</div>
            <div className="mt-0.5 text-gray-900 dark:text-white">
              {student.address || "No informado"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500">
              Grupo sanguíneo
            </div>
            <div className="mt-0.5 text-gray-900 dark:text-white">
              {student.bloodType || "No informado"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500">
              Contacto de emergencia
            </div>
            <div className="mt-0.5 text-gray-900 dark:text-white">
              {student.emergencyContact || "No informado"}
            </div>
            {student.emergencyPhone ? (
              <div className="text-xs text-gray-500">
                {student.emergencyPhone}
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500">
              Alergias / Notas médicas
            </div>
            <div className="mt-0.5 text-gray-900 dark:text-white">
              {student.allergiesNotes || "Sin observaciones médicas"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Responsables y Tutores
          </h2>
          {student.guardians.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay responsables vinculados.
            </p>
          ) : (
            <div className="space-y-3">
              {student.guardians.map((link) => (
                <div
                  key={link.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={link.guardian.photoUrl}
                        name={`${link.guardian.firstName} ${link.guardian.lastName}`}
                        size="sm"
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {link.guardian.lastName}, {link.guardian.firstName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {link.relationship}
                      {link.isFinancialResponsible
                        ? " · Responsable financiero"
                        : ""}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    DNI {link.guardian.dni} ·{" "}
                    {link.guardian.email || "Sin email"} ·{" "}
                    {link.guardian.whatsapp ||
                      link.guardian.phone ||
                      "Sin teléfono"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Becas y Observaciones
          </h2>
          {student.scholarships.length === 0 ? (
            <p className="text-sm text-gray-500">Sin becas asignadas.</p>
          ) : (
            <div className="space-y-2">
              {student.scholarships.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {sc.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {sc.academicYear?.name ?? "Ciclo lectivo"}
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {sc.type === "PERCENTAGE"
                      ? `${sc.value}%`
                      : formatARS(sc.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {student.observations ? (
            <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              {student.observations}
            </p>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Cuenta Corriente y Cuotas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-right">Final</th>
                <th className="px-5 py-3 text-right">Pagado</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {student.feeCharges.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    Sin cuotas emitidas.
                  </td>
                </tr>
              ) : (
                student.feeCharges.map((fee) => {
                  const balance = Math.max(
                    0,
                    Number(fee.finalAmount) - Number(fee.paidAmount),
                  );
                  const latestPayment = fee.allocations.find(
                    (a) => a.payment.status === "COMPLETED",
                  )?.payment;

                  return (
                    <tr key={fee.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        {fee.period}
                      </td>
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                        {fee.description}
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
                            const menuHeight = 160;
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Asistencia reciente
            </h2>
            <span className="text-xs text-gray-500">
              P: {attendanceCounts.PRESENT ?? 0} · A:{" "}
              {attendanceCounts.ABSENT ?? 0} · T: {attendanceCounts.LATE ?? 0} ·
              J: {attendanceCounts.EXCUSED ?? 0}
            </span>
          </div>
          {student.attendances.length === 0 ? (
            <p className="text-sm text-gray-500">Sin registros de asistencia.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {student.attendances.slice(0, 20).map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateAR(att.date)}
                    </span>
                    {att.observations ? (
                      <span className="ml-2 text-xs text-gray-500">
                        {att.observations}
                      </span>
                    ) : null}
                  </div>
                  <StatusBadge status={att.status} category="attendance" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Calificaciones / Boletín
          </h2>
          {student.gradeRecords.length === 0 ? (
            <p className="text-sm text-gray-500">
              Sin calificaciones cargadas.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800">
                  <tr>
                    <th className="py-2">Materia</th>
                    <th className="py-2">Período</th>
                    <th className="py-2 text-right">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {student.gradeRecords.map((gr) => (
                    <tr key={gr.id}>
                      <td className="py-2 font-medium text-gray-900 dark:text-white">
                        {gr.subject.name}
                        {gr.observations ? (
                          <div className="text-xs font-normal text-gray-500">
                            {gr.observations}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">
                        {gr.term}
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-900 dark:text-white">
                        {Number(gr.score).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {payCharge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Registrar Pago en Caja
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {payCharge.description} ({payCharge.period})
            </p>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
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
                  onClick={() => setPayCharge(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingPay ? "Procesando..." : "Confirmar Cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {openMenu ? (
        (() => {
          const fee = student.feeCharges.find((f) => f.id === openMenu.id);
          if (!fee) return null;
          const balance = Math.max(
            0,
            Number(fee.finalAmount) - Number(fee.paidAmount),
          );
          const latestPayment = fee.allocations.find(
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
                    disabled={sendingNotifId === fee.id}
                    onClick={() => {
                      setOpenMenu(null);
                      void handleSendEmail(fee.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Enviar Email
                  </button>
                </>
              ) : null}
              {latestPayment ? (
                <a
                  href={`/api/payments/${latestPayment.id}/receipt`}
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
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
