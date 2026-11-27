"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import { TablePagination } from "@/components/school/TablePagination";
import { TableToolbar } from "@/components/school/TableToolbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface EmployeeItem {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  roleTitle: string;
  department: string;
  hireDate: string | null;
  active: boolean;
  teacher: {
    id: string;
    divisions: Array<{
      id: string;
      name: string;
      grade: {
        name: string;
        level: { name: string };
      };
    }>;
  } | null;
}

const DEPARTMENTS = [
  "Dirección",
  "Administración",
  "Inicial",
  "Primaria",
  "Secundaria",
  "Tesorería",
];

export default function AdminEmpleadosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("Administración");
  const [hireDate, setHireDate] = useState("");

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

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (department) params.set("department", department);
      const res = await fetch(`/api/employees?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al listar empleados");
      }
      setEmployees(json.employees ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al listar empleados",
      );
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [department, search]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  async function handleCreateEmployee(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dni: dni.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          photoUrl: photoUrl.trim() || null,
          roleTitle: roleTitle.trim(),
          department: newDepartment,
          hireDate: hireDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el empleado");
      }
      setShowModal(false);
      setFirstName("");
      setLastName("");
      setDni("");
      setEmail("");
      setPhone("");
      setPhotoUrl("");
      setRoleTitle("");
      setHireDate("");
      setFeedback(`Empleado ${lastName}, ${firstName} registrado.`);
      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear empleado",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyEmail(emp: EmployeeItem) {
    const val = emp.email || emp.phone || `${emp.firstName} ${emp.lastName}`;
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      // Ignore clipboard failure
    }
    setCopiedId(emp.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === emp.id ? null : prev));
      setOpenMenu((prev) => (prev?.id === emp.id ? null : prev));
    }, 900);
  }

  const employeeTabs = useMemo(
    () => [
      { key: "ALL", label: "Todos", count: employees.length },
      {
        key: "ACTIVE",
        label: "Activos",
        count: employees.filter((e) => e.active).length,
      },
      {
        key: "INACTIVE",
        label: "Inactivos",
        count: employees.filter((e) => !e.active).length,
      },
    ],
    [employees],
  );

  const visibleEmployees = useMemo(() => {
    if (activeTab === "ACTIVE") return employees.filter((e) => e.active);
    if (activeTab === "INACTIVE") return employees.filter((e) => !e.active);
    return employees;
  }, [activeTab, employees]);

  useEffect(() => {
    setPage(1);
  }, [search, department, activeTab]);

  const paginatedEmployees = useMemo(
    () => visibleEmployees.slice((page - 1) * 20, page * 20),
    [page, visibleEmployees],
  );

  return (
    <div className="space-y-6">
      <TableToolbar
        tabs={employeeTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, DNI o cargo..."
        activeFiltersCount={department ? 1 : 0}
        filtersContent={
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500">
              Departamento
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todos los departamentos</option>
              {DEPARTMENTS.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
        }
        actions={[
          {
            label: "Nuevo Empleado",
            icon: (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            ),
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
                <th className="px-5 py-3">Empleado</th>
                <th className="px-5 py-3">Cargo</th>
                <th className="px-5 py-3">Departamento</th>
                <th className="px-5 py-3">DNI</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Cursos asignados</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && !hasLoadedOnce ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando personal...
                  </td>
                </tr>
              ) : visibleEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron empleados.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/admin/empleados/${emp.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={emp.photoUrl}
                          name={`${emp.firstName} ${emp.lastName}`}
                          size="md"
                        />
                        <span>
                          {emp.lastName}, {emp.firstName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{emp.roleTitle}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {emp.department}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{emp.dni}</td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{emp.email || "Sin email"}</div>
                      <div className="text-xs text-gray-500">
                        {emp.phone || "Sin teléfono"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {emp.teacher && emp.teacher.divisions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.teacher.divisions.map((d) => (
                            <span
                              key={d.id}
                              className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                            >
                              {d.grade.name} {d.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No aplica</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={emp.active ? "ACTIVE" : "INACTIVE"}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        aria-label="Acciones"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenu?.id === emp.id) {
                            setOpenMenu(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 96;
                          const openUp =
                            rect.bottom + menuHeight > window.innerHeight;
                          setOpenMenu({
                            id: emp.id,
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
        <TablePagination
          page={page}
          pageSize={20}
          totalItems={visibleEmployees.length}
          onPageChange={setPage}
        />
      </section>

      {openMenu ? (
        (() => {
          const emp = employees.find((item) => item.id === openMenu.id);
          if (!emp) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            >
              <Link
                href={`/admin/empleados/${emp.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver legajo
              </Link>
              <button
                type="button"
                onClick={() => void handleCopyEmail(emp)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copiedId === emp.id ? (
                  <>
                    <svg className="size-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-emerald-700">Copiado</span>
                  </>
                ) : (
                  <>
                    <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copiar contacto
                  </>
                )}
              </button>
              {emp.teacher ? (
                <Link
                  href="/admin/cursos"
                  onClick={() => setOpenMenu(null)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 7v14" />
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                  </svg>
                  Ver cursos
                </Link>
              ) : null}
            </div>
          );
        })()
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Nuevo Empleado
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
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
                    Cargo
                  </label>
                  <input
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Ej. Preceptor, Docente Titular"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Departamento
                  </label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {DEPARTMENTS.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Fecha de ingreso
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Email
                  </label>
                  <input
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
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  URL de foto (opcional)
                </label>
                <input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
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
                  {submitting ? "Guardando..." : "Guardar Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
