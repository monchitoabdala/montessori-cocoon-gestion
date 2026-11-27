"use client";

import { KpiCard } from "@/components/school/KpiCard";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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
function IconBook({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
function IconClipboard({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
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
function IconRefresh({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

interface DivisionItem {
  id: string;
  name: string;
  capacity: number;
  grade: {
    id: string;
    name: string;
    order: number;
    level: { id: string; name: string };
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string | null;
    teacherId: string | null;
    teacher: { id: string; firstName: string; lastName: string } | null;
  }>;
  _count: {
    students: number;
  };
}

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
  grade: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
}

interface StructureResponse {
  divisions: DivisionItem[];
  subjects: SubjectItem[];
}

export default function DocenteHomePage() {
  const [data, setData] = useState<StructureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStructure = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/structure?mine=true", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo cargar la estructura docente");
      }
      setData({
        divisions: json.divisions ?? [],
        subjects: json.subjects ?? [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al cargar los cursos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  const totalStudents = useMemo(() => {
    if (!data) return 0;
    return data.divisions.reduce((acc, d) => acc + (d._count?.students ?? 0), 0);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/docente/asistencia"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          <IconCalendarCheck className="size-4" />
          Tomar asistencia
        </Link>
        <Link
          href="/docente/notas"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <IconClipboard className="size-4" />
          Cargar notas
        </Link>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadStructure()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-200"
          >
            <IconRefresh className="size-3.5" />
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Divisiones asignadas"
          value={loading ? "..." : (data?.divisions.length ?? 0)}
          subtitle="Cursos donde sos titular o dictas materias"
          icon={<IconUsers className="size-4" />}
        />
        <KpiCard
          title="Materias a cargo"
          value={loading ? "..." : (data?.subjects.length ?? 0)}
          subtitle="Asignaturas habilitadas para boletin"
          icon={<IconBook className="size-4" />}
        />
        <KpiCard
          title="Alumnos en tus cursos"
          value={loading ? "..." : totalStudents}
          subtitle="Estudiantes activos totales"
          icon={<IconCalendarCheck className="size-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Mis Divisiones
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              />
            ))}
          </div>
        ) : data && data.divisions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            No tenes divisiones asignadas actualmente. Contacta a secretaria para verificar tu asignacion.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data?.divisions.map((div) => (
              <div
                key={div.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {div.grade.level.name}
                      </span>
                      <h3 className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">
                        {div.grade.name} {div.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {div._count.students} alumnos
                    </span>
                  </div>

                  {div.teacher ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Docente a cargo: {div.teacher.lastName}, {div.teacher.firstName}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Materias en esta division
                    </p>
                    {div.subjects.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Sin materias registradas
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {div.subjects.map((subj) => (
                          <Link
                            key={subj.id}
                            href={`/docente/notas?divisionId=${encodeURIComponent(div.id)}&subjectId=${encodeURIComponent(subj.id)}`}
                            className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                          >
                            {subj.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <Link
                    href={`/docente/asistencia?divisionId=${encodeURIComponent(div.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  >
                    Tomar asistencia
                    <IconArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href={`/docente/notas?divisionId=${encodeURIComponent(div.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  >
                    Cargar notas
                    <IconArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && data && data.subjects.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Mis Materias
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Materia</th>
                    <th className="px-4 py-3 font-medium">Codigo</th>
                    <th className="px-4 py-3 font-medium">Curso</th>
                    <th className="px-4 py-3 text-right font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.subjects.map((subj) => (
                    <tr
                      key={subj.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {subj.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subj.code || "S/C"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {subj.grade?.name ?? ""} {subj.division?.name ?? ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/docente/notas?divisionId=${encodeURIComponent(subj.division?.id ?? "")}&subjectId=${encodeURIComponent(subj.id)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                        >
                          Cargar notas
                          <IconArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
