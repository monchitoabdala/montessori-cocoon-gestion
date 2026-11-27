"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type LeaveType = "VACATION" | "MEDICAL" | "PERSONAL" | "STUDY";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface EmployeeBalance {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  roleTitle: string;
  department: string;
  vacationDaysLimit: number;
  usedVacationDays: number;
  remainingVacationDays: number;
}

interface LeaveEvent {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: LeaveStatus;
  notes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    roleTitle: string;
    department: string;
    vacationDaysLimit: number;
  };
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION: "Vacaciones",
  MEDICAL: "Médica",
  PERSONAL: "Particular",
  STUDY: "Estudio",
};

const LEAVE_PILL_STYLES: Record<LeaveType, string> = {
  VACATION: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  MEDICAL: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  STUDY: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  PERSONAL: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
};

const STATUS_DOT: Record<LeaveStatus, string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  REJECTED: "bg-red-500",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMonthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoToDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function countDaysInclusive(startStr: string, endStr: string): number {
  const s = new Date(`${startStr}T00:00:00Z`).getTime();
  const e = new Date(`${endStr}T00:00:00Z`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 1;
  return Math.max(1, Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function formatDateAR(iso: string): string {
  return new Date(`${isoToDateOnly(iso)}T12:00:00`).toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

export default function AdminVacacionesPage() {
  const [month, setMonth] = useState<string>("2026-11");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [employees, setEmployees] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Drag-to-create state
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formType, setFormType] = useState<LeaveType>("VACATION");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDaysCount, setFormDaysCount] = useState("1");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Selected leave action modal
  const [selectedLeave, setSelectedLeave] = useState<LeaveEvent | null>(null);
  const [updatingLeave, setUpdatingLeave] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("month", month);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      const res = await fetch(`/api/leaves?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al cargar vacaciones");
      }
      setLeaves(json.leaves ?? []);
      const empList: EmployeeBalance[] = json.employees ?? [];
      setEmployees(empList);
      if (empList.length > 0 && !formEmployeeId) {
        setFormEmployeeId(empList[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar vacaciones",
      );
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, formEmployeeId, month]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  const openCreateWithRange = useCallback(
    (startStr: string, endStr: string) => {
      const [a, b] = startStr <= endStr ? [startStr, endStr] : [endStr, startStr];
      setFormStartDate(a);
      setFormEndDate(b);
      setFormDaysCount(String(countDaysInclusive(a, b)));
      setFormType("VACATION");
      setFormNotes("");
      if (!formEmployeeId && employees.length > 0) {
        setFormEmployeeId(employeeFilter || employees[0].id);
      } else if (employeeFilter) {
        setFormEmployeeId(employeeFilter);
      }
      setShowCreateModal(true);
    },
    [employeeFilter, employees, formEmployeeId],
  );

  // Global mouseup to complete drag even if released outside cells
  useEffect(() => {
    if (!dragStart) return;
    function handleMouseUp() {
      if (dragStart && dragEnd) {
        openCreateWithRange(dragStart, dragEnd);
      }
      setDragStart(null);
      setDragEnd(null);
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragEnd, dragStart, openCreateWithRange]);

  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y || 2026, m || 11];
  }, [month]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(yearNum, monthNum - 1, 1);
    const jsDay = firstOfMonth.getDay(); // 0=Sun..6=Sat
    const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
    const gridStart = new Date(yearNum, monthNum - 1, 1 - mondayOffset);

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      inMonth: boolean;
    }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      );
      cells.push({
        dateStr: toDateStr(d),
        dayNum: d.getDate(),
        inMonth: d.getMonth() === monthNum - 1,
      });
    }
    return cells;
  }, [monthNum, yearNum]);

  const dragRange = useMemo(() => {
    if (!dragStart || !dragEnd) return null;
    return dragStart <= dragEnd
      ? { start: dragStart, end: dragEnd }
      : { start: dragEnd, end: dragStart };
  }, [dragEnd, dragStart]);

  function shiftMonth(delta: number) {
    const d = new Date(yearNum, monthNum - 1 + delta, 1);
    setMonth(toMonthStr(d));
  }

  function goToday() {
    setMonth(toMonthStr(new Date()));
  }

  async function handleCreateLeave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formEmployeeId,
          type: formType,
          startDate: formStartDate,
          endDate: formEndDate,
          daysCount: Number(formDaysCount),
          notes: formNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo registrar la licencia");
      }
      setShowCreateModal(false);
      setFeedback("Licencia registrada en el calendario.");
      await loadLeaves();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar licencia",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateLeaveStatus(
    leaveId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    setUpdatingLeave(true);
    setError(null);
    try {
      const res = await fetch("/api/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar la licencia");
      }
      setSelectedLeave(null);
      setFeedback(
        status === "APPROVED" ? "Solicitud aprobada." : "Solicitud rechazada.",
      );
      await loadLeaves();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar licencia",
      );
    } finally {
      setUpdatingLeave(false);
    }
  }

  const todayStr = toDateStr(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="border-r border-gray-200 px-2.5 py-2 text-gray-600 hover:bg-gray-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="min-w-36 px-3 py-1.5 text-center text-sm font-semibold text-gray-900">
              {MONTH_NAMES[monthNum - 1]} {yearNum}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="border-l border-gray-200 px-2.5 py-2 text-gray-600 hover:bg-gray-50"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoy
          </button>

          <span className="hidden text-xs text-gray-400 xl:inline">
            Arrastrá sobre los días para solicitar licencia
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Todos los empleados</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.lastName}, {emp.firstName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => openCreateWithRange(`${month}-10`, `${month}-14`)}
            className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nueva Licencia
          </button>
        </div>
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white xl:col-span-3">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/70">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-r border-gray-200 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 select-none">
            {calendarCells.map((cell, idx) => {
              const isDragged =
                dragRange &&
                cell.dateStr >= dragRange.start &&
                cell.dateStr <= dragRange.end;

              const dayLeaves = leaves.filter((lv) => {
                const start = isoToDateOnly(lv.startDate);
                const end = isoToDateOnly(lv.endDate);
                return cell.dateStr >= start && cell.dateStr <= end;
              });

              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.dateStr}
                  onMouseDown={() => {
                    setDragStart(cell.dateStr);
                    setDragEnd(cell.dateStr);
                  }}
                  onMouseEnter={() => {
                    if (dragStart) {
                      setDragEnd(cell.dateStr);
                    }
                  }}
                  className={`min-h-24 border-b border-r border-gray-200 p-1.5 transition-colors ${
                    (idx + 1) % 7 === 0 ? "border-r-0" : ""
                  } ${idx >= 35 ? "border-b-0" : ""} ${
                    isDragged
                      ? "bg-brand-50"
                      : cell.inMonth
                        ? "bg-white hover:bg-gray-50/50"
                        : "bg-gray-50/60"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? "bg-brand-600 text-white"
                          : cell.inMonth
                            ? "text-gray-800"
                            : "text-gray-400"
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayLeaves.slice(0, 3).map((lv) => (
                      <button
                        key={lv.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeave(lv);
                        }}
                        className={`flex w-full items-center gap-1 rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors ${LEAVE_PILL_STYLES[lv.type]}`}
                      >
                        <Avatar
                          src={lv.employee.photoUrl}
                          name={`${lv.employee.firstName} ${lv.employee.lastName}`}
                          size="sm"
                          className="size-4 text-[8px]"
                        />
                        <span className="truncate">
                          {lv.employee.lastName} · {LEAVE_TYPE_LABELS[lv.type]}
                        </span>
                        <span
                          className={`ml-auto size-1.5 shrink-0 rounded-full ${STATUS_DOT[lv.status]}`}
                        />
                      </button>
                    ))}
                    {dayLeaves.length > 3 ? (
                      <div className="px-1 text-[10px] font-medium text-gray-500">
                        +{dayLeaves.length - 3} más
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 border-b border-gray-200 pb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Saldos de Vacaciones
            </h2>
            <p className="text-xs text-gray-500">
              Días anuales usados y disponibles.
            </p>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500">Cargando saldos...</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const pct =
                  emp.vacationDaysLimit > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (emp.usedVacationDays / emp.vacationDaysLimit) * 100,
                        ),
                      )
                    : 0;
                return (
                  <Link
                    key={emp.id}
                    href={`/admin/empleados/${emp.id}`}
                    className="block rounded-lg border border-gray-200 p-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          src={emp.photoUrl}
                          name={`${emp.firstName} ${emp.lastName}`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-gray-900">
                            {emp.lastName}, {emp.firstName}
                          </div>
                          <div className="truncate text-[11px] text-gray-500">
                            {emp.roleTitle}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-gray-900">
                        {emp.usedVacationDays} / {emp.vacationDaysLimit} d
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 90 ? "bg-amber-500" : "bg-brand-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-[11px] text-gray-500">
                      {emp.remainingVacationDays} días disponibles
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Solicitar Vacaciones / Licencia
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Empleado
                </label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.lastName}, {emp.firstName} ({emp.remainingVacationDays}{" "}
                      días disp.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Tipo de licencia
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as LeaveType)}
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
                    value={formStartDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormStartDate(val);
                      if (formEndDate && val) {
                        setFormDaysCount(
                          String(countDaysInclusive(val, formEndDate)),
                        );
                      }
                    }}
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
                    value={formEndDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormEndDate(val);
                      if (formStartDate && val) {
                        setFormDaysCount(
                          String(countDaysInclusive(formStartDate, val)),
                        );
                      }
                    }}
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
                  value={formDaysCount}
                  onChange={(e) => setFormDaysCount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Observaciones (opcional)
                </label>
                <input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedLeave ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedLeave.employee.photoUrl}
                  name={`${selectedLeave.employee.firstName} ${selectedLeave.employee.lastName}`}
                  size="md"
                />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedLeave.employee.lastName},{" "}
                    {selectedLeave.employee.firstName}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {LEAVE_TYPE_LABELS[selectedLeave.type]} ·{" "}
                    {selectedLeave.daysCount} días
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-500">Estado</span>
                <StatusBadge status={selectedLeave.status} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-500">Período</span>
                <span className="font-medium text-gray-900">
                  {formatDateAR(selectedLeave.startDate)} al{" "}
                  {formatDateAR(selectedLeave.endDate)}
                </span>
              </div>
              {selectedLeave.notes ? (
                <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600">
                  {selectedLeave.notes}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/admin/empleados/${selectedLeave.employee.id}`}
                onClick={() => setSelectedLeave(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Ver legajo
              </Link>

              {selectedLeave.status === "PENDING" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingLeave}
                    onClick={() =>
                      void handleUpdateLeaveStatus(selectedLeave.id, "REJECTED")
                    }
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={updatingLeave}
                    onClick={() =>
                      void handleUpdateLeaveStatus(selectedLeave.id, "APPROVED")
                    }
                    className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
