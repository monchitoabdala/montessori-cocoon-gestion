"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface LeaveItem {
  id: string;
  type: "VACATION" | "MEDICAL" | "PERSONAL" | "STUDY";
  startDate: string;
  endDate: string;
  daysCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
}

interface PayrollItem {
  id: string;
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  notes: string | null;
}

interface EmployeeDetail {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  cuil: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  roleTitle: string;
  department: string;
  hireDate: string | null;
  baseSalary: number | null;
  active: boolean;
  vacationDaysLimit?: number;
  usedVacationDays?: number;
  remainingVacationDays?: number;
  teacher: {
    id: string;
  } | null;
  leaves: LeaveItem[];
  payrollRecords: PayrollItem[];
}

const LEAVE_TYPE_LABELS: Record<LeaveItem["type"], string> = {
  VACATION: "Vacaciones",
  MEDICAL: "Licencia Médica",
  PERSONAL: "Asunto Particular",
  STUDY: "Licencia por Estudio",
};

function formatARS(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDateAR(iso: string | null | undefined): string {
  if (!iso) return "No informada";
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

export default function AdminEmpleadoDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params?.id;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<{
    type: "leave" | "payroll";
    id: string;
    top: number;
    right: number;
  } | null>(null);

  // Leave modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveItem["type"]>("VACATION");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveDays, setLeaveDays] = useState("1");
  const [leaveNotes, setLeaveNotes] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Payroll modal
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payPeriod, setPayPeriod] = useState(getCurrentPeriod);
  const [payGross, setPayGross] = useState("");
  const [payDeductions, setPayDeductions] = useState("0");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayroll, setSubmittingPayroll] = useState(false);

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

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo cargar el empleado");
      }
      setEmployee(json.employee);
      if (json.employee?.baseSalary) {
        setPayGross(String(json.employee.baseSalary));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el empleado",
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  async function handleCreateLeave(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setSubmittingLeave(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_LEAVE",
          type: leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          daysCount: Number(leaveDays),
          notes: leaveNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear la solicitud");
      }
      setShowLeaveModal(false);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveDays("1");
      setLeaveNotes("");
      setFeedback("Solicitud de licencia registrada.");
      await loadEmployee();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear solicitud",
      );
    } finally {
      setSubmittingLeave(false);
    }
  }

  async function handleUpdateLeave(
    leaveId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    if (!employeeId) return;
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LEAVE",
          leaveId,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar la licencia");
      }
      setFeedback(
        status === "APPROVED" ? "Licencia aprobada." : "Licencia rechazada.",
      );
      await loadEmployee();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar licencia",
      );
    }
  }

  async function handleCreatePayroll(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    setSubmittingPayroll(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PAYROLL",
          period: payPeriod,
          grossAmount: Number(payGross),
          deductions: Number(payDeductions) || 0,
          notes: payNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo liquidar el sueldo");
      }
      setShowPayrollModal(false);
      setPayNotes("");
      setFeedback(`Liquidación ${payPeriod} registrada.`);
      await loadEmployee();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al liquidar sueldo",
      );
    } finally {
      setSubmittingPayroll(false);
    }
  }

  async function handleMarkPayrollPaid(payrollId: string) {
    if (!employeeId) return;
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_PAYROLL_PAID",
          payrollId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo marcar como pagado");
      }
      setFeedback("Recibo de sueldo marcado como pagado.");
      await loadEmployee();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar nómina",
      );
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Cargando legajo del empleado...
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/empleados"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Volver a Empleados
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/empleados"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a Empleados
        </Link>

        {employee.teacher ? (
          <Link
            href={`/admin/docentes/${employee.teacher.id}`}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Ver ficha docente
          </Link>
        ) : null}
      </div>

      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={employee.photoUrl}
              name={`${employee.firstName} ${employee.lastName}`}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-semibold text-gray-900">
                  {employee.lastName}, {employee.firstName}
                </span>
                <StatusBadge
                  status={employee.active ? "ACTIVE" : "INACTIVE"}
                />
              </div>
              <div className="mt-0.5 text-sm text-gray-500">
                {employee.roleTitle} · {employee.department}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-medium text-gray-500">
              Sueldo Base Mensual
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {employee.baseSalary
                ? formatARS(employee.baseSalary)
                : "No definido"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">DNI</div>
            <div className="mt-0.5 font-medium text-gray-900">
              {employee.dni}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">CUIL</div>
            <div className="mt-0.5 font-medium text-gray-900">
              {employee.cuil || "No informado"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">
              Fecha de Ingreso
            </div>
            <div className="mt-0.5 font-medium text-gray-900">
              {formatDateAR(employee.hireDate)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">Contacto</div>
            <div className="mt-0.5 truncate text-gray-900">
              {employee.email || "Sin email"}
            </div>
            <div className="text-xs text-gray-500">
              {employee.phone || "Sin teléfono"}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Vacaciones y Licencias
            </h2>
            {typeof employee.vacationDaysLimit === "number" ? (
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600">
                  Saldo anual: {employee.usedVacationDays ?? 0} /{" "}
                  {employee.vacationDaysLimit} días usados (
                  {employee.remainingVacationDays ?? employee.vacationDaysLimit}{" "}
                  disponibles)
                </span>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{
                      width: `${
                        employee.vacationDaysLimit > 0
                          ? Math.min(
                              100,
                              Math.round(
                                ((employee.usedVacationDays ?? 0) /
                                  employee.vacationDaysLimit) *
                                  100,
                              ),
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Nueva Solicitud
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Desde</th>
                <th className="px-5 py-3">Hasta</th>
                <th className="px-5 py-3 text-right">Días</th>
                <th className="px-5 py-3">Observaciones</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employee.leaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    Sin solicitudes de vacaciones o licencias.
                  </td>
                </tr>
              ) : (
                employee.leaves.map((lv) => (
                  <tr key={lv.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {LEAVE_TYPE_LABELS[lv.type]}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatDateAR(lv.startDate)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatDateAR(lv.endDate)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {lv.daysCount}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {lv.notes || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lv.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {lv.status === "PENDING" ? (
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              openMenu?.type === "leave" &&
                              openMenu.id === lv.id
                            ) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setOpenMenu({
                              type: "leave",
                              id: lv.id,
                              top: rect.bottom + 4,
                              right: Math.max(
                                8,
                                window.innerWidth - rect.right,
                              ),
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
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
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Nómina y Liquidación de Sueldos
          </h2>
          <button
            type="button"
            onClick={() => setShowPayrollModal(true)}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Liquidar Sueldo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3 text-right">Bruto</th>
                <th className="px-5 py-3 text-right">Deducciones</th>
                <th className="px-5 py-3 text-right">Neto</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Fecha de Pago</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employee.payrollRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    Sin liquidaciones registradas.
                  </td>
                </tr>
              ) : (
                employee.payrollRecords.map((pr) => (
                  <tr key={pr.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {pr.period}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {formatARS(pr.grossAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {formatARS(pr.deductions)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatARS(pr.netAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={pr.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {pr.paidAt ? formatDateAR(pr.paidAt) : "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {pr.status === "PENDING" ? (
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              openMenu?.type === "payroll" &&
                              openMenu.id === pr.id
                            ) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setOpenMenu({
                              type: "payroll",
                              id: pr.id,
                              top: rect.bottom + 4,
                              right: Math.max(
                                8,
                                window.innerWidth - rect.right,
                              ),
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
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
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openMenu ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: openMenu.top, right: openMenu.right }}
          className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
        >
          {openMenu.type === "leave" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const id = openMenu.id;
                  setOpenMenu(null);
                  void handleUpdateLeave(id, "APPROVED");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-gray-50"
              >
                Aprobar solicitud
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = openMenu.id;
                  setOpenMenu(null);
                  void handleUpdateLeave(id, "REJECTED");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-gray-50"
              >
                Rechazar solicitud
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const id = openMenu.id;
                setOpenMenu(null);
                void handleMarkPayrollPaid(id);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Marcar como Pagado
            </button>
          )}
        </div>
      ) : null}

      {showLeaveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Solicitud de Licencia
              </h2>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Tipo de licencia
                </label>
                <select
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as LeaveItem["type"])
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="VACATION">Vacaciones</option>
                  <option value="MEDICAL">Licencia Médica</option>
                  <option value="PERSONAL">Asunto Particular</option>
                  <option value="STUDY">Licencia por Estudio</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Desde
                  </label>
                  <input
                    required
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Hasta
                  </label>
                  <input
                    required
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Cantidad de días
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Observaciones (opcional)
                </label>
                <input
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingLeave ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showPayrollModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Liquidar Sueldo
              </h2>
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreatePayroll} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Período (YYYY-MM)
                </label>
                <input
                  required
                  type="month"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Importe Bruto (ARS)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={payGross}
                    onChange={(e) => setPayGross(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Deducciones (ARS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={payDeductions}
                    onChange={(e) => setPayDeductions(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Observaciones (opcional)
                </label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayroll}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingPayroll ? "Guardando..." : "Liquidar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
