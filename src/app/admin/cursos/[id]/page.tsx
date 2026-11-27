"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface DivisionDetail {
  id: string;
  name: string;
  capacity: number;
  grade: {
    id: string;
    name: string;
    monthlyFeeAmount: string | number;
    enrollmentFeeAmount: string | number;
    level: { id: string; name: string };
    academicYear: { id: string; year: number; name: string };
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    employee: {
      id: string;
      photoUrl: string | null;
      roleTitle: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
  students: Array<{
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
    dni: string;
    photoUrl: string | null;
    status: string;
    guardians: Array<{
      relationship: string;
      isFinancialResponsible: boolean;
      guardian: {
        id: string;
        firstName: string;
        lastName: string;
        photoUrl: string | null;
        phone: string | null;
      };
    }>;
  }>;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string | null;
}

function formatARS(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export default function AdminCursoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const divisionId = params?.id;

  const [division, setDivision] = useState<DivisionDetail | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);

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

  const loadDivision = useCallback(async () => {
    if (!divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const [divRes, tRes] = await Promise.all([
        fetch(`/api/divisions/${divisionId}`, { cache: "no-store" }),
        fetch("/api/teachers", { cache: "no-store" }),
      ]);
      const divJson = await divRes.json();
      if (!divRes.ok) {
        throw new Error(divJson.error || "No se pudo cargar el curso");
      }
      setDivision(divJson.division);
      setSelectedTeacherId(divJson.division?.teacher?.id ?? "");
      if (tRes.ok) {
        const tJson = await tRes.json();
        setTeachers(tJson.teachers ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el curso",
      );
    } finally {
      setLoading(false);
    }
  }, [divisionId]);

  useEffect(() => {
    void loadDivision();
  }, [loadDivision]);

  async function handleSaveTeacher(e: FormEvent) {
    e.preventDefault();
    if (!divisionId) return;
    setSavingTeacher(true);
    setError(null);
    try {
      const res = await fetch(`/api/divisions/${divisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar el docente");
      }
      setShowTeacherModal(false);
      setFeedback("Docente a cargo actualizado.");
      await loadDivision();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar docente",
      );
    } finally {
      setSavingTeacher(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Cargando detalle del curso...
      </div>
    );
  }

  if (error && !division) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/cursos"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Volver a Cursos
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!division) return null;

  const studentCount = division.students.length;
  const divStatus = !division.teacher
    ? "SIN_DOCENTE"
    : studentCount >= division.capacity
      ? "COMPLETO"
      : "CON_VACANTES";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/cursos"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a Cursos
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/asistencia"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Tomar Asistencia
          </Link>
          <Link
            href="/admin/boletines"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Cargar Boletines
          </Link>
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

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div>
            <span className="text-base font-semibold text-gray-900">
              {division.grade.level.name} · {division.grade.name}{" "}
              {division.name}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              {division.grade.academicYear.name}
            </span>
          </div>
          <StatusBadge status={divStatus} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">
              Arancel Mensual
            </div>
            <div className="mt-0.5 font-semibold text-gray-900">
              {formatARS(division.grade.monthlyFeeAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">
              Matrícula Anual
            </div>
            <div className="mt-0.5 font-semibold text-gray-900">
              {formatARS(division.grade.enrollmentFeeAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">
              Matrícula Actual
            </div>
            <div className="mt-0.5 font-semibold text-gray-900">
              {studentCount} alumnos
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">Cupo Máximo</div>
            <div className="mt-0.5 font-semibold text-gray-900">
              {division.capacity} vacantes
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Docente a cargo
            </h2>
            <button
              type="button"
              onClick={() => setShowTeacherModal(true)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {division.teacher ? "Cambiar Docente" : "Asignar Docente"}
            </button>
          </div>

          {!division.teacher ? (
            <p className="text-sm text-gray-500">
              Este curso todavía no tiene un docente titular asignado.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3.5">
              <div className="flex items-center gap-3">
                <Avatar
                  src={division.teacher.employee?.photoUrl}
                  name={`${division.teacher.firstName} ${division.teacher.lastName}`}
                  size="lg"
                />
                <div>
                  <Link
                    href={`/admin/docentes/${division.teacher.id}`}
                    className="font-semibold text-gray-900 hover:text-brand-600 hover:underline"
                  >
                    {division.teacher.lastName}, {division.teacher.firstName}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {division.teacher.specialty ||
                      division.teacher.employee?.roleTitle ||
                      "Docente Titular"}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {division.teacher.email ||
                      division.teacher.employee?.email ||
                      "Sin email"}{" "}
                    ·{" "}
                    {division.teacher.phone ||
                      division.teacher.employee?.phone ||
                      "Sin teléfono"}
                  </div>
                </div>
              </div>
              <Link
                href={`/admin/docentes/${division.teacher.id}`}
                className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Ver ficha
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Materias del curso ({division.subjects.length})
            </h2>
          </div>

          {division.subjects.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay materias específicas registradas para esta división.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {division.subjects.map((sub) => (
                <span
                  key={sub.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  {sub.name} {sub.code ? `(${sub.code})` : ""}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Alumnos del curso ({division.students.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">DNI</th>
                <th className="px-5 py-3">Tutor Principal</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {division.students.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No hay alumnos inscriptos en este curso.
                  </td>
                </tr>
              ) : (
                division.students.map((st) => {
                  const mainGuardian =
                    st.guardians.find((g) => g.isFinancialResponsible)
                      ?.guardian ?? st.guardians[0]?.guardian;
                  return (
                    <tr
                      key={st.id}
                      onClick={() => router.push(`/admin/alumnos/${st.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/70"
                    >
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
                          <span>
                            {st.lastName}, {st.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{st.dni}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {mainGuardian ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={mainGuardian.photoUrl}
                              name={`${mainGuardian.firstName} ${mainGuardian.lastName}`}
                              size="sm"
                            />
                            <span>
                              {mainGuardian.lastName}, {mainGuardian.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin tutor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={st.status} category="student" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Acciones"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenu?.id === st.id) {
                              setOpenMenu(null);
                              return;
                            }
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const menuHeight = 64;
                            const openUp =
                              rect.bottom + menuHeight > window.innerHeight;
                            setOpenMenu({
                              id: st.id,
                              top: openUp
                                ? Math.max(8, rect.top - menuHeight)
                                : rect.bottom + 4,
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openMenu ? (
        (() => {
          const st = division.students.find((s) => s.id === openMenu.id);
          if (!st) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            >
              <Link
                href={`/admin/alumnos/${st.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver legajo completo
              </Link>
            </div>
          );
        })()
      ) : null}

      {showTeacherModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Docente a cargo
              </h2>
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Seleccionar docente
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Sin docente asignado</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lastName}, {t.firstName}
                      {t.specialty ? ` (${t.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTeacher}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingTeacher ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
