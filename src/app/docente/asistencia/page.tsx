"use client";

import { KpiCard } from "@/components/school/KpiCard";
import { StatusBadge } from "@/components/school/StatusBadge";
import { cn } from "@/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function IconCheckCheck({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16" />
    </svg>
  );
}
function IconSave({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
function IconUserCheck({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
function IconUserX({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="17" x2="22" y1="8" y2="13" />
      <line x1="22" x2="17" y1="8" y2="13" />
    </svg>
  );
}
function IconClock({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconCalendarCheck({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </svg>
  );
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface DivisionOption {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
    level: { id: string; name: string };
  };
}

interface StudentRow {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  dni: string;
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  observations: string | null;
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "PRESENT", label: "Presente" },
  { value: "ABSENT", label: "Ausente" },
  { value: "LATE", label: "Tarde" },
  { value: "EXCUSED", label: "Justificado" },
];

function AsistenciaContent() {
  const searchParams = useSearchParams();
  const initialDivisionId = searchParams.get("divisionId") ?? "";

  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const [selectedDate, setSelectedDate] = useState(getTodayIsoDate);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [obsMap, setObsMap] = useState<Record<string, string>>({});

  const [loadingDivisions, setLoadingDivisions] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDivisions() {
      setLoadingDivisions(true);
      try {
        const res = await fetch("/api/structure?mine=true", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar divisiones");
        }
        if (!active) return;
        const list: DivisionOption[] = json.divisions ?? [];
        setDivisions(list);
        setSelectedDivisionId((prev) => {
          if (prev && list.some((d) => d.id === prev)) return prev;
          return list[0]?.id ?? "";
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error al cargar divisiones",
          );
        }
      } finally {
        if (active) setLoadingDivisions(false);
      }
    }
    void loadDivisions();
    return () => {
      active = false;
    };
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!selectedDivisionId || !selectedDate) {
      setStudents([]);
      return;
    }
    setLoadingAttendance(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/attendance?divisionId=${encodeURIComponent(selectedDivisionId)}&date=${encodeURIComponent(selectedDate)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo cargar la asistencia");
      }

      const studentList: StudentRow[] = json.students ?? [];
      const existing: AttendanceRecord[] = json.attendances ?? [];

      const existingByStudent = new Map<string, AttendanceRecord>();
      for (const rec of existing) {
        existingByStudent.set(rec.studentId, rec);
      }

      const nextStatus: Record<string, AttendanceStatus> = {};
      const nextObs: Record<string, string> = {};
      for (const st of studentList) {
        const found = existingByStudent.get(st.id);
        nextStatus[st.id] = found?.status ?? "PRESENT";
        nextObs[st.id] = found?.observations ?? "";
      }

      setStudents(studentList);
      setStatusMap(nextStatus);
      setObsMap(nextObs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar la asistencia",
      );
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedDivisionId, selectedDate]);

  useEffect(() => {
    if (selectedDivisionId && selectedDate) {
      void loadAttendance();
    }
  }, [selectedDivisionId, selectedDate, loadAttendance]);

  const counts = useMemo(() => {
    const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const st of students) {
      const val = statusMap[st.id] ?? "PRESENT";
      summary[val] += 1;
    }
    return summary;
  }, [students, statusMap]);

  function markAllPresent() {
    const next: Record<string, AttendanceStatus> = {};
    for (const st of students) {
      next[st.id] = "PRESENT";
    }
    setStatusMap(next);
    setSuccessMsg(null);
  }

  async function handleSave() {
    if (!selectedDivisionId || !selectedDate || students.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const records = students.map((st) => ({
        studentId: st.id,
        status: statusMap[st.id] ?? "PRESENT",
        observations: obsMap[st.id]?.trim() || null,
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisionId: selectedDivisionId,
          date: selectedDate,
          records,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo guardar la asistencia");
      }
      setSuccessMsg(
        `Asistencia guardada correctamente para ${json.updated ?? records.length} alumnos.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar asistencia",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={markAllPresent}
          disabled={students.length === 0 || loadingAttendance}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <IconCheckCheck className="size-4" />
          Todos presentes
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || students.length === 0 || loadingAttendance}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <IconSave className="size-4" />
          {saving ? "Guardando..." : "Guardar asistencia"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <label
            htmlFor="division-select"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Division asignada
          </label>
          <select
            id="division-select"
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            disabled={loadingDivisions}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {divisions.length === 0 ? (
              <option value="">Sin divisiones asignadas</option>
            ) : null}
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.grade.level.name} · {div.grade.name} {div.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="attendance-date"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Fecha de registro
          </label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Presentes"
          value={counts.PRESENT}
          icon={<IconUserCheck className="size-4" />}
        />
        <KpiCard
          title="Ausentes"
          value={counts.ABSENT}
          icon={<IconUserX className="size-4" />}
        />
        <KpiCard
          title="Llegadas tarde"
          value={counts.LATE}
          icon={<IconClock className="size-4" />}
        />
        <KpiCard
          title="Justificados"
          value={counts.EXCUSED}
          icon={<IconCalendarCheck className="size-4" />}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loadingAttendance ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Cargando listado de alumnos...
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay alumnos activos en la division seleccionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Legajo</th>
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((st) => {
                  const currentStatus = statusMap[st.id] ?? "PRESENT";
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {st.legajo}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {st.lastName}, {st.firstName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          DNI {st.dni}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const selected = currentStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setStatusMap((prev) => ({
                                    ...prev,
                                    [st.id]: opt.value,
                                  }));
                                  setSuccessMsg(null);
                                }}
                                className={cn(
                                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                                  selected
                                    ? "border-brand-600 bg-brand-600 text-white"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
                                )}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                          <StatusBadge
                            status={currentStatus}
                            category="attendance"
                            className="ml-1 hidden xl:inline-flex"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={obsMap[st.id] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setObsMap((prev) => ({ ...prev, [st.id]: value }));
                            setSuccessMsg(null);
                          }}
                          placeholder="Nota opcional..."
                          className="w-full min-w-[180px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocenteAsistenciaPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Cargando modulo de asistencia...
        </div>
      }
    >
      <AsistenciaContent />
    </Suspense>
  );
}
