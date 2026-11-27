"use client";

import { KpiCard } from "@/components/school/KpiCard";
import { StatusBadge } from "@/components/school/StatusBadge";
import { cn } from "@/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function IconArrowLeft({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7M19 12H5" />
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
function IconAward({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
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

interface StudentOption {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
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
        className="size-10 shrink-0 rounded-full border border-gray-200 bg-gray-50 object-cover"
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-700">
      {initials}
    </div>
  );
}

interface AttendanceItem {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  observations: string | null;
}

interface GradeItem {
  id: string;
  term: string;
  score: string | number;
  observations: string | null;
  subject: {
    id: string;
    name: string;
    code: string | null;
  };
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

function AcademicoContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") ?? "";

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);

  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAcademic, setLoadingAcademic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStudents() {
      setLoadingStudents(true);
      try {
        const res = await fetch("/api/students", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar alumnos");
        }
        if (!active) return;
        const list: StudentOption[] = json.students ?? [];
        setStudents(list);
        setSelectedStudentId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0]?.id ?? "";
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error al cargar alumnos",
          );
        }
      } finally {
        if (active) setLoadingStudents(false);
      }
    }
    void loadStudents();
    return () => {
      active = false;
    };
  }, []);

  const loadAcademicData = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoadingAcademic(true);
    setError(null);
    try {
      const [attRes, gradesRes] = await Promise.all([
        fetch(
          `/api/attendance?studentId=${encodeURIComponent(selectedStudentId)}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/grades?studentId=${encodeURIComponent(selectedStudentId)}`,
          { cache: "no-store" },
        ),
      ]);

      const [attJson, gradesJson] = await Promise.all([
        attRes.json(),
        gradesRes.json(),
      ]);

      if (!attRes.ok) {
        throw new Error(attJson?.error || "Error al cargar asistencia");
      }
      if (!gradesRes.ok) {
        throw new Error(gradesJson?.error || "Error al cargar calificaciones");
      }

      setAttendances(attJson.attendances ?? []);
      setGrades(gradesJson.gradeRecords ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar trayectoria academica",
      );
    } finally {
      setLoadingAcademic(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      void loadAcademicData();
    }
  }, [selectedStudentId, loadAcademicData]);

  const availableTerms = useMemo(() => {
    const set = new Set<string>();
    for (const g of grades) {
      set.add(g.term);
    }
    return Array.from(set);
  }, [grades]);

  const filteredGrades = useMemo(() => {
    if (selectedTerm === "ALL") return grades;
    return grades.filter((g) => g.term === selectedTerm);
  }, [grades, selectedTerm]);

  const summary = useMemo(() => {
    const totalAtt = attendances.length;
    const present = attendances.filter((a) => a.status === "PRESENT").length;
    const absent = attendances.filter((a) => a.status === "ABSENT").length;
    const lateOrExcused = attendances.filter(
      (a) => a.status === "LATE" || a.status === "EXCUSED",
    ).length;
    const attendanceRate =
      totalAtt > 0 ? `${Math.round((present / totalAtt) * 100)}%` : "S/D";

    const numericScores = filteredGrades
      .map((g) => Number(g.score))
      .filter((n) => Number.isFinite(n));
    const avgScore =
      numericScores.length > 0
        ? (
            numericScores.reduce((a, b) => a + b, 0) / numericScores.length
          ).toFixed(2)
        : "S/D";

    return {
      totalAtt,
      present,
      absent,
      lateOrExcused,
      attendanceRate,
      avgScore,
    };
  }, [attendances, filteredGrades]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <IconArrowLeft className="size-4" />
          Volver a Cuotas y Pagos
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <label
          htmlFor="student-selector"
          className="block text-xs font-medium text-gray-600 dark:text-gray-400"
        >
          Seleccionar alumno
        </label>
        <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            id="student-selector"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={loadingStudents}
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {students.length === 0 ? (
              <option value="">Sin alumnos vinculados</option>
            ) : null}
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.lastName}, {st.firstName} (Legajo {st.legajo})
              </option>
            ))}
          </select>

          {selectedStudent ? (
            <div className="flex flex-wrap items-center gap-3">
              <StudentAvatar
                photoUrl={selectedStudent.photoUrl}
                firstName={selectedStudent.firstName}
                lastName={selectedStudent.lastName}
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedStudent.lastName}, {selectedStudent.firstName}
                </div>
                <div className="text-xs text-gray-500">
                  Legajo {selectedStudent.legajo}
                  {selectedStudent.division
                    ? ` · ${selectedStudent.division.grade.level.name} · ${selectedStudent.division.grade.name} ${selectedStudent.division.name}`
                    : ""}
                </div>
              </div>
              {selectedStudent.allergiesNotes ? (
                <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {selectedStudent.allergiesNotes}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Asistencia"
          value={loadingAcademic ? "..." : summary.attendanceRate}
          subtitle={`${summary.present} presentes de ${summary.totalAtt} registros`}
          icon={<IconUserCheck className="size-4" />}
        />
        <KpiCard
          title="Ausencias"
          value={loadingAcademic ? "..." : summary.absent}
          icon={<IconUserX className="size-4" />}
        />
        <KpiCard
          title="Tarde / Justificadas"
          value={loadingAcademic ? "..." : summary.lateOrExcused}
          icon={<IconClock className="size-4" />}
        />
        <KpiCard
          title="Promedio general"
          value={loadingAcademic ? "..." : summary.avgScore}
          subtitle="Escala de 0 a 10"
          icon={<IconAward className="size-4" />}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Boletin de Calificaciones
          </h2>
          {availableTerms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTerm("ALL")}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedTerm === "ALL"
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300",
                )}
              >
                Todos
              </button>
              {availableTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSelectedTerm(term)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedTerm === term
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300",
                  )}
                >
                  {term}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loadingAcademic ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Cargando calificaciones...
            </div>
          ) : filteredGrades.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Todavia no hay notas cargadas para este alumno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Materia</th>
                    <th className="px-4 py-3 font-medium">Periodo</th>
                    <th className="px-4 py-3 text-right font-medium">Nota</th>
                    <th className="px-4 py-3 font-medium">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredGrades.map((g) => {
                    const score = Number(g.score);
                    return (
                      <tr
                        key={g.id}
                        className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {g.subject.name}
                          {g.subject.code ? (
                            <span className="ml-2 text-xs text-gray-400">
                              ({g.subject.code})
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                          {g.term}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                              score >= 6
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
                            )}
                          >
                            {score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {g.observations || "Sin observaciones"}
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
        <div className="flex items-center gap-2">
          <IconCalendarCheck className="size-4 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Registro de Asistencia Diaria
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {loadingAcademic ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Cargando historial de asistencia...
            </div>
          ) : attendances.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No hay registros de asistencia para este alumno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {attendances.map((att) => (
                    <tr
                      key={att.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {formatDate(att.date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={att.status}
                          category="attendance"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {att.observations || "Sin novedades"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PortalAcademicoPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Cargando trayectoria academica...
        </div>
      }
    >
      <AcademicoContent />
    </Suspense>
  );
}
