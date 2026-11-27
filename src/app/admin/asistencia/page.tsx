"use client";

import { Avatar } from "@/components/school/Avatar";
import { GroupedSelect, type GroupedSelectGroup } from "@/components/school/GroupedSelect";
import { StatusBadge } from "@/components/school/StatusBadge";
import { useCallback, useEffect, useMemo, useState } from "react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface DivisionItem {
  id: string;
  name: string;
  grade: {
    name: string;
    level: { name: string };
  };
}

interface AttendanceStudent {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  observations: string | null;
}

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "PRESENT", label: "Presente" },
  { value: "ABSENT", label: "Ausente" },
  { value: "LATE", label: "Tarde" },
  { value: "EXCUSED", label: "Justificado" },
];

export default function AdminAsistenciaPage() {
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [date, setDate] = useState(getTodayDateStr);

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [records, setRecords] = useState<
    Record<string, { status: AttendanceStatus; observations: string }>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadDivisions() {
      const res = await fetch("/api/structure", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const divs: DivisionItem[] = json.divisions ?? [];
        setDivisions(divs);
        if (divs.length > 0) {
          setDivisionId(divs[0].id);
        }
      }
    }
    void loadDivisions();
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!divisionId || !date) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/attendance?divisionId=${encodeURIComponent(divisionId)}&date=${encodeURIComponent(date)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al cargar asistencia");
      }

      const list: AttendanceStudent[] = json.students ?? [];
      const existing: AttendanceRecord[] = json.attendances ?? [];
      const existingMap = new Map(existing.map((a) => [a.studentId, a]));

      const nextRecords: Record<
        string,
        { status: AttendanceStatus; observations: string }
      > = {};
      for (const st of list) {
        const match = existingMap.get(st.id);
        nextRecords[st.id] = {
          status: match?.status ?? "PRESENT",
          observations: match?.observations ?? "",
        };
      }

      setStudents(list);
      setRecords(nextRecords);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asistencia",
      );
    } finally {
      setLoading(false);
    }
  }, [date, divisionId]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        status,
        observations: prev[studentId]?.observations ?? "",
      },
    }));
  }

  function updateObservations(studentId: string, observations: string) {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? "PRESENT",
        observations,
      },
    }));
  }

  function markAllPresent() {
    setRecords((prev) => {
      const next = { ...prev };
      for (const st of students) {
        next[st.id] = {
          status: "PRESENT",
          observations: prev[st.id]?.observations ?? "",
        };
      }
      return next;
    });
  }

  async function handleSave() {
    if (!divisionId || !date || students.length === 0) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const payload = {
        divisionId,
        date,
        records: students.map((st) => ({
          studentId: st.id,
          status: records[st.id]?.status ?? "PRESENT",
          observations: records[st.id]?.observations.trim() || null,
        })),
      };

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al guardar asistencia");
      }

      setFeedback(`Asistencia guardada (${json.updated} alumnos).`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar asistencia",
      );
    } finally {
      setSaving(false);
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={markAllPresent}
          disabled={students.length === 0}
          className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          Todos Presentes
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || students.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar Asistencia"}
        </button>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            División
          </label>
          <GroupedSelect
            value={divisionId}
            onChange={setDivisionId}
            groups={divisionGroups}
            placeholder="Seleccionar división..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Marcar</th>
                <th className="px-5 py-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando listado de asistencia...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No hay alumnos activos en esta división.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const current = records[st.id] ?? {
                    status: "PRESENT" as AttendanceStatus,
                    observations: "",
                  };
                  return (
                    <tr key={st.id}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {st.legajo}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={st.photoUrl}
                            name={`${st.firstName} ${st.lastName}`}
                            size="sm"
                          />
                          <span>
                            {st.lastName}, {st.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={current.status}
                          category="attendance"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="inline-flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updateStatus(st.id, opt.value)}
                              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                                current.status === opt.value
                                  ? "border-brand-600 bg-brand-600 text-white"
                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={current.observations}
                          onChange={(e) =>
                            updateObservations(st.id, e.target.value)
                          }
                          placeholder="Nota opcional..."
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
