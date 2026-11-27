"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import { TableToolbar } from "@/components/school/TableToolbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface LevelItem {
  id: string;
  name: string;
  order: number;
}

interface GradeItem {
  id: string;
  name: string;
  order: number;
  monthlyFeeAmount: string | number;
  enrollmentFeeAmount: string | number;
  level: { id: string; name: string; order: number };
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
    employee?: {
      id: string;
      photoUrl: string | null;
      roleTitle: string;
      department: string;
    } | null;
  } | null;
  _count?: {
    students: number;
  };
}

interface EmployeeTeacher {
  id: string;
  firstName: string;
  lastName: string;
  teacherId: string | null;
}

function formatARS(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export default function AdminCursosPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [teachers, setTeachers] = useState<EmployeeTeacher[]>([]);

  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newGradeId, setNewGradeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newCapacity, setNewCapacity] = useState("30");

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

  const loadStructure = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [structRes, empRes] = await Promise.all([
        fetch("/api/structure", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);
      const structJson = await structRes.json();
      if (!structRes.ok) {
        throw new Error(structJson.error || "Error al cargar cursos");
      }
      setLevels(structJson.levels ?? []);
      setGrades(structJson.grades ?? []);
      setDivisions(structJson.divisions ?? []);
      if (structJson.grades?.length > 0 && !newGradeId) {
        setNewGradeId(structJson.grades[0].id);
      }

      if (empRes.ok) {
        const empJson = await empRes.json();
        setTeachers(
          (empJson.employees ?? []).filter(
            (e: EmployeeTeacher) => Boolean(e.teacherId),
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cursos");
    } finally {
      setLoading(false);
    }
  }, [newGradeId]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  const gradeById = useMemo(
    () => new Map(grades.map((g) => [g.id, g])),
    [grades],
  );

  const levelTabs = useMemo(
    () => [
      { key: "", label: "Todos", count: divisions.length },
      ...levels.map((lvl) => ({
        key: lvl.id,
        label: lvl.name,
        count: divisions.filter((d) => d.grade.level.id === lvl.id).length,
      })),
    ],
    [divisions, levels],
  );

  const groupedLevels = useMemo(() => {
    const visibleLevels = levelFilter
      ? levels.filter((l) => l.id === levelFilter)
      : levels;
    const q = search.trim().toLowerCase();

    return visibleLevels.map((lvl) => ({
      level: lvl,
      divisions: divisions.filter((d) => {
        if (d.grade.level.id !== lvl.id) return false;
        if (q) {
          const text =
            `${d.grade.name} ${d.name} ${d.teacher ? `${d.teacher.lastName} ${d.teacher.firstName}` : ""}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      }),
    }));
  }, [divisions, levelFilter, levels, search]);

  async function handleCreateDivision(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeId: newGradeId,
          name: newName.trim(),
          teacherId: newTeacherId || null,
          capacity: Number(newCapacity) || 30,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear la división");
      }
      setShowModal(false);
      setNewName("");
      setNewTeacherId("");
      setFeedback("Curso / división creado correctamente.");
      await loadStructure();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear la división",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <TableToolbar
        tabs={levelTabs}
        activeTab={levelFilter}
        onTabChange={setLevelFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar curso, división o docente..."
        actions={[
          {
            label: "Nuevo Curso / División",
            primary: true,
            onClick: () => setShowModal(true),
          },
        ]}
      />

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

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Cargando cursos y divisiones...
        </div>
      ) : (
        <div className="space-y-5">
          {groupedLevels.map(({ level, divisions: lvlDivisions }, idx) => (
            <section
              key={level.id}
              className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${
                idx > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/70 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                  {level.name}
                </h2>
                <span className="text-xs text-gray-500">
                  {lvlDivisions.length} divisiones
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs font-medium text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Grado</th>
                      <th className="px-5 py-3">División</th>
                      <th className="px-5 py-3 text-right">Arancel Mensual</th>
                      <th className="px-5 py-3 text-right">Matrícula</th>
                      <th className="px-5 py-3">Docente Titular</th>
                      <th className="px-5 py-3 text-right">Alumnos</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lvlDivisions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-6 text-center text-sm text-gray-500"
                        >
                          Sin divisiones registradas en este nivel.
                        </td>
                      </tr>
                    ) : (
                      lvlDivisions.map((div) => {
                        const gradeInfo = gradeById.get(div.grade.id);
                        const studentCount = div._count?.students ?? 0;
                        const divStatus = !div.teacher
                          ? "SIN_DOCENTE"
                          : studentCount >= div.capacity
                            ? "COMPLETO"
                            : "CON_VACANTES";
                        return (
                          <tr
                            key={div.id}
                            onClick={() =>
                              router.push(`/admin/cursos/${div.id}`)
                            }
                            className="cursor-pointer transition-colors hover:bg-gray-50/70"
                          >
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {div.grade.name}
                            </td>
                            <td className="px-5 py-3 text-gray-700">
                              <Link
                                href={`/admin/cursos/${div.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-gray-900 hover:text-brand-600 hover:underline"
                              >
                                {div.name}
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-gray-900">
                              {gradeInfo
                                ? formatARS(gradeInfo.monthlyFeeAmount)
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-600">
                              {gradeInfo
                                ? formatARS(gradeInfo.enrollmentFeeAmount)
                                : "-"}
                            </td>
                            <td className="px-5 py-3">
                              {div.teacher ? (
                                <Link
                                  href={`/admin/docentes/${div.teacher.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-2.5 text-gray-700 hover:text-brand-600 hover:underline"
                                >
                                  <Avatar
                                    src={div.teacher.employee?.photoUrl}
                                    name={`${div.teacher.firstName} ${div.teacher.lastName}`}
                                    size="sm"
                                  />
                                  <span>
                                    {div.teacher.lastName},{" "}
                                    {div.teacher.firstName}
                                  </span>
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Sin asignar
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900">
                              {studentCount}
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={divStatus} />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                aria-label="Acciones"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openMenu?.id === div.id) {
                                    setOpenMenu(null);
                                    return;
                                  }
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  const menuHeight = 96;
                                  const openUp =
                                    rect.bottom + menuHeight >
                                    window.innerHeight;
                                  setOpenMenu({
                                    id: div.id,
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
          ))}
        </div>
      )}

      {openMenu ? (
        (() => {
          const div = divisions.find((d) => d.id === openMenu.id);
          if (!div) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            >
              <Link
                href={`/admin/cursos/${div.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 7v14" />
                  <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                </svg>
                Ver detalle del curso
              </Link>
              <Link
                href={`/admin/alumnos?divisionId=${div.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                Ver alumnos
              </Link>
              <Link
                href="/admin/asistencia"
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
                Tomar asistencia
              </Link>
            </div>
          );
        })()
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Nuevo Curso / División
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateDivision} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Grado / Año
                </label>
                <select
                  required
                  value={newGradeId}
                  onChange={(e) => setNewGradeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.level.name} - {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    División
                  </label>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. A, B, C"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Capacidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Docente Titular (opcional)
                </label>
                <select
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.teacherId ?? ""}>
                      {t.lastName}, {t.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Crear División"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
