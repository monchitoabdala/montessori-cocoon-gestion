"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import { TableToolbar } from "@/components/school/TableToolbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface TeacherItem {
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
    _count?: { students: number };
  }>;
  subjects: Array<{
    id: string;
    name: string;
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

export default function AdminDocentesPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);

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

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/teachers?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al listar docentes");
      }
      setTeachers(json.teachers ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al listar docentes",
      );
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [search]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    async function loadDivisions() {
      const res = await fetch("/api/structure", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDivisions(json.divisions ?? []);
      }
    }
    void loadDivisions();
  }, []);

  function toggleDivision(id: string) {
    setSelectedDivisions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleCreateTeacher(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dni: dni.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          specialty: specialty.trim() || undefined,
          password: password.trim() || undefined,
          divisionIds: selectedDivisions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el docente");
      }
      setShowModal(false);
      setFirstName("");
      setLastName("");
      setDni("");
      setEmail("");
      setPhone("");
      setSpecialty("");
      setPassword("");
      setSelectedDivisions([]);
      setFeedback(`Docente ${lastName}, ${firstName} creado correctamente.`);
      await loadTeachers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear docente");
    } finally {
      setSubmitting(false);
    }
  }

  const teacherTabs = useMemo(
    () => [
      { key: "ALL", label: "Todos", count: teachers.length },
      {
        key: "ASSIGNED",
        label: "Con cursos",
        count: teachers.filter((t) => t.divisions.length > 0).length,
      },
      {
        key: "UNASSIGNED",
        label: "Sin asignar",
        count: teachers.filter((t) => t.divisions.length === 0).length,
      },
    ],
    [teachers],
  );

  const visibleTeachers = useMemo(() => {
    if (activeTab === "ASSIGNED") {
      return teachers.filter((t) => t.divisions.length > 0);
    }
    if (activeTab === "UNASSIGNED") {
      return teachers.filter((t) => t.divisions.length === 0);
    }
    return teachers;
  }, [activeTab, teachers]);

  return (
    <div className="space-y-6">
      <TableToolbar
        tabs={teacherTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar docente por nombre, DNI o especialidad..."
        actions={[
          {
            label: "Nuevo Docente",
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

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Docente</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Cursos asignados</th>
                <th className="px-5 py-3 text-right">Materias</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && !hasLoadedOnce ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando docentes...
                  </td>
                </tr>
              ) : visibleTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron docentes.
                  </td>
                </tr>
              ) : (
                visibleTeachers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/docentes/${t.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={t.employee?.photoUrl}
                          name={`${t.firstName} ${t.lastName}`}
                          size="md"
                        />
                        <div>
                          <Link
                            href={`/admin/docentes/${t.id}`}
                            className="hover:text-brand-600 hover:underline"
                          >
                            {t.lastName}, {t.firstName}
                          </Link>
                          <div className="text-xs font-normal text-gray-500">
                            {t.specialty || t.employee?.roleTitle || "Docente"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{t.email || "Sin email"}</div>
                      <div className="text-xs text-gray-500">
                        {t.phone || "Sin teléfono"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {t.divisions.length === 0 ? (
                        <span className="text-xs text-gray-400">
                          Sin cursos asignados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {t.divisions.map((d) => (
                            <span
                              key={d.id}
                              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                            >
                              {d.grade.level.name} · {d.grade.name} {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {t.subjects.length}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          (t.employee?.active ?? true) ? "ACTIVE" : "INACTIVE"
                        }
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        aria-label="Acciones"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenu?.id === t.id) {
                            setOpenMenu(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 64;
                          const openUp =
                            rect.bottom + menuHeight > window.innerHeight;
                          setOpenMenu({
                            id: t.id,
                            top: openUp
                              ? Math.max(8, rect.top - menuHeight)
                              : rect.bottom + 4,
                            right: Math.max(8, window.innerWidth - rect.right),
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openMenu ? (
        (() => {
          const t = teachers.find((item) => item.id === openMenu.id);
          if (!t) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            >
              <Link
                href={`/admin/docentes/${t.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver pantalla del docente
              </Link>
            </div>
          );
        })()
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Nuevo Docente
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Nombre
                  </label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Apellido
                  </label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    DNI
                  </label>
                  <input
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Teléfono
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Especialidad
                  </label>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ej. Matemática, Nivel Inicial"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Contraseña de acceso (opcional, por defecto docente123)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Cursos a cargo (divisiones)
                </label>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                  {divisions.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 text-xs text-gray-700"
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
                  {submitting ? "Guardando..." : "Crear Docente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
