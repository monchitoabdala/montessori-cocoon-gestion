"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface TeacherDetail {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  employee: {
    id: string;
    photoUrl: string | null;
    roleTitle: string;
    department: string;
    active?: boolean;
  } | null;
  divisions: Array<{
    id: string;
    name: string;
    grade: {
      name: string;
      level: { name: string };
    };
    students: Array<{
      id: string;
      legajo: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
      status: string;
    }>;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    code: string | null;
    division: {
      id: string;
      name: string;
      grade: {
        name: string;
        level: { name: string };
      };
    } | null;
  }>;
}

interface DivisionOption {
  id: string;
  name: string;
  grade: {
    name: string;
    level: { name: string };
  };
}

export default function AdminDocenteDetailPage() {
  const params = useParams<{ id: string }>();
  const teacherId = params?.id;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [allDivisions, setAllDivisions] = useState<DivisionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const loadTeacher = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/teachers/${teacherId}`, { cache: "no-store" }),
        fetch("/api/structure", { cache: "no-store" }),
      ]);
      const tJson = await tRes.json();
      if (!tRes.ok) {
        throw new Error(tJson.error || "No se pudo cargar el docente");
      }
      setTeacher(tJson.teacher);
      setSelectedDivisions(
        (tJson.teacher?.divisions ?? []).map((d: { id: string }) => d.id),
      );
      if (sRes.ok) {
        const sJson = await sRes.json();
        setAllDivisions(sJson.divisions ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el docente",
      );
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void loadTeacher();
  }, [loadTeacher]);

  function toggleDivision(id: string) {
    setSelectedDivisions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSaveDivisions(e: FormEvent) {
    e.preventDefault();
    if (!teacherId) return;
    setSavingAssign(true);
    setError(null);
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisionIds: selectedDivisions }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudieron asignar los cursos");
      }
      setShowAssignModal(false);
      setFeedback("Cursos asignados actualizados.");
      await loadTeacher();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al asignar cursos",
      );
    } finally {
      setSavingAssign(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Cargando ficha docente...
      </div>
    );
  }

  if (error && !teacher) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/docentes"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Volver a Docentes
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!teacher) return null;

  const assignedStudents = teacher.divisions.flatMap((d) =>
    d.students.map((st) => ({
      ...st,
      divisionLabel: `${d.grade.level.name} · ${d.grade.name} ${d.name}`,
      divisionId: d.id,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            src={teacher.employee?.photoUrl}
            name={`${teacher.firstName} ${teacher.lastName}`}
            size="lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-base font-semibold text-gray-900">
                {teacher.lastName}, {teacher.firstName}
              </span>
              <StatusBadge
                status={
                  (teacher.employee?.active ?? true) ? "ACTIVE" : "INACTIVE"
                }
              />
              {teacher.specialty ? (
                <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {teacher.specialty}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-sm text-gray-500">
              DNI {teacher.dni} · {teacher.email || "Sin email"} ·{" "}
              {teacher.phone || "Sin teléfono"}
            </div>
          </div>
        </div>

        <Link
          href="/admin/docentes"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a Docentes
        </Link>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Cursos asignados
            </h2>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Asignar Cursos
            </button>
          </div>

          {teacher.divisions.length === 0 ? (
            <p className="text-sm text-gray-500">
              No tiene cursos asignados como titular.
            </p>
          ) : (
            <div className="space-y-2.5">
              {teacher.divisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {d.grade.level.name} · {d.grade.name} {d.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.students.length} alumnos
                    </div>
                  </div>
                  <Link
                    href={`/admin/alumnos?divisionId=${d.id}`}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Ver alumnos
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Materias que dicta
            </h2>
          </div>

          {teacher.subjects.length === 0 ? (
            <p className="text-sm text-gray-500">
              Sin materias asignadas.
            </p>
          ) : (
            <div className="space-y-2">
              {teacher.subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {sub.name} {sub.code ? `(${sub.code})` : ""}
                  </span>
                  <span className="text-xs text-gray-500">
                    {sub.division
                      ? `${sub.division.grade.level.name} · ${sub.division.grade.name} ${sub.division.name}`
                      : "General"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Alumnos a cargo ({assignedStudents.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Legajo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    Sin alumnos en cursos asignados.
                  </td>
                </tr>
              ) : (
                assignedStudents.map((st) => (
                  <tr key={`${st.divisionId}:${st.id}`}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {st.legajo}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={st.photoUrl}
                          name={`${st.firstName} ${st.lastName}`}
                          size="sm"
                        />
                        <Link
                          href={`/admin/alumnos/${st.id}`}
                          className="hover:text-brand-600 hover:underline"
                        >
                          {st.lastName}, {st.firstName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {st.divisionLabel}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={st.status} category="student" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/alumnos/${st.id}`}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Ver legajo
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAssignModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Asignar Cursos
              </h2>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveDivisions} className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {allDivisions.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDivisions.includes(d.id)}
                      onChange={() => toggleDivision(d.id)}
                      className="rounded border-gray-300 text-brand-600"
                    />
                    <span>
                      {d.grade.level.name} · {d.grade.name} {d.name}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAssign}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingAssign ? "Guardando..." : "Guardar Cursos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
