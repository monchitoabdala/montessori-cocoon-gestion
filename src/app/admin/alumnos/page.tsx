"use client";

import { Avatar } from "@/components/school/Avatar";
import { GroupedSelect, type GroupedSelectGroup } from "@/components/school/GroupedSelect";
import { StatusBadge } from "@/components/school/StatusBadge";
import { TableToolbar } from "@/components/school/TableToolbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface LevelItem {
  id: string;
  name: string;
}

interface DivisionItem {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
    level: { id: string; name: string };
  };
}

interface GuardianItem {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  photoUrl?: string | null;
}

interface StudentItem {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  dni: string;
  status: string;
  photoUrl: string | null;
  address: string | null;
  bloodType: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  allergiesNotes: string | null;
  division: {
    id: string;
    name: string;
    grade: {
      id: string;
      name: string;
      level: { id: string; name: string };
    };
  } | null;
  guardians: Array<{
    relationship: string;
    isFinancialResponsible: boolean;
    guardian: GuardianItem;
  }>;
  scholarships: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
  }>;
}

function StudentAvatar({
  photoUrl,
  firstName,
  lastName,
}: {
  photoUrl: string | null;
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
        className="size-9 shrink-0 rounded-full border border-gray-200 bg-gray-100 object-cover"
      />
    );
  }

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600">
      {initials}
    </div>
  );
}

export default function AdminAlumnosPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);

  const [search, setSearch] = useState("");
  const [levelId, setLevelId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!openMenu && !statusMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setStatusMenuOpen(false);
      }
    }
    function handleClose() {
      setOpenMenu(null);
      setStatusMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [openMenu, statusMenuOpen]);

  // New student form
  const [stFirstName, setStFirstName] = useState("");
  const [stLastName, setStLastName] = useState("");
  const [stDni, setStDni] = useState("");
  const [stBirthDate, setStBirthDate] = useState("");
  const [stLegajo, setStLegajo] = useState("");
  const [stDivisionId, setStDivisionId] = useState("");
  const [stGuardianId, setStGuardianId] = useState("");
  const [stRelationship, setStRelationship] = useState("Madre/Padre");
  const [stObservations, setStObservations] = useState("");
  const [stPhotoUrl, setStPhotoUrl] = useState("");
  const [stAddress, setStAddress] = useState("");
  const [stBloodType, setStBloodType] = useState("");
  const [stEmergencyContact, setStEmergencyContact] = useState("");
  const [stEmergencyPhone, setStEmergencyPhone] = useState("");
  const [stAllergiesNotes, setStAllergiesNotes] = useState("");

  // New guardian form
  const [gdFirstName, setGdFirstName] = useState("");
  const [gdLastName, setGdLastName] = useState("");
  const [gdDni, setGdDni] = useState("");
  const [gdEmail, setGdEmail] = useState("");
  const [gdPhone, setGdPhone] = useState("");
  const [gdWhatsapp, setGdWhatsapp] = useState("");
  const [gdAddress, setGdAddress] = useState("");
  const [gdCreateAccount, setGdCreateAccount] = useState(false);
  const [gdPassword, setGdPassword] = useState("");

  const loadMetadata = useCallback(async () => {
    const [structRes, guardRes] = await Promise.all([
      fetch("/api/structure", { cache: "no-store" }),
      fetch("/api/guardians", { cache: "no-store" }),
    ]);
    if (structRes.ok) {
      const sJson = await structRes.json();
      setLevels(sJson.levels ?? []);
      setDivisions(sJson.divisions ?? []);
    }
    if (guardRes.ok) {
      const gJson = await guardRes.json();
      setGuardians(gJson.guardians ?? []);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (levelId) params.set("levelId", levelId);
      if (divisionId) params.set("divisionId", divisionId);

      const res = await fetch(`/api/students?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al listar alumnos");
      }
      setStudents(json.students ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al listar alumnos",
      );
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [divisionId, levelId, search]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  async function handleCreateStudent(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: stFirstName,
        lastName: stLastName,
        dni: stDni,
        birthDate: stBirthDate,
        divisionId: stDivisionId || null,
        observations: stObservations || null,
        photoUrl: stPhotoUrl.trim() || null,
        address: stAddress.trim() || null,
        bloodType: stBloodType.trim() || null,
        emergencyContact: stEmergencyContact.trim() || null,
        emergencyPhone: stEmergencyPhone.trim() || null,
        allergiesNotes: stAllergiesNotes.trim() || null,
      };
      if (stLegajo.trim()) {
        payload.legajo = stLegajo.trim();
      }
      if (stGuardianId) {
        payload.guardians = [
          {
            guardianId: stGuardianId,
            relationship: stRelationship || "Tutor",
            isFinancialResponsible: true,
          },
        ];
      }

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el alumno");
      }

      setShowStudentModal(false);
      setStFirstName("");
      setStLastName("");
      setStDni("");
      setStBirthDate("");
      setStLegajo("");
      setStDivisionId("");
      setStGuardianId("");
      setStObservations("");
      setStPhotoUrl("");
      setStAddress("");
      setStBloodType("");
      setStEmergencyContact("");
      setStEmergencyPhone("");
      setStAllergiesNotes("");
      setFeedback(
        `Alumno ${json.student.lastName}, ${json.student.firstName} registrado correctamente.`,
      );
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear alumno");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGuardian(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: gdFirstName,
        lastName: gdLastName,
        dni: gdDni,
        email: gdEmail.trim() || null,
        phone: gdPhone.trim() || null,
        whatsapp: gdWhatsapp.trim() || null,
        address: gdAddress.trim() || null,
        createUserAccount: gdCreateAccount,
      };
      if (gdCreateAccount && gdPassword) {
        payload.password = gdPassword;
      }

      const res = await fetch("/api/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el responsable");
      }

      setShowGuardianModal(false);
      setGdFirstName("");
      setGdLastName("");
      setGdDni("");
      setGdEmail("");
      setGdPhone("");
      setGdWhatsapp("");
      setGdAddress("");
      setGdCreateAccount(false);
      setGdPassword("");
      setFeedback(
        `Responsable ${json.guardian.lastName}, ${json.guardian.firstName} creado correctamente.`,
      );
      await loadMetadata();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear responsable",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredDivisions = levelId
    ? divisions.filter((d) => d.grade.level.id === levelId)
    : divisions;

  const divisionGroups = useMemo<GroupedSelectGroup[]>(() => {
    const map = new Map<string, GroupedSelectGroup>();
    for (const d of filteredDivisions) {
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
  }, [filteredDivisions]);

  const studentTabs = useMemo(
    () => [
      { key: "", label: "Todos", count: students.length },
      {
        key: "ACTIVE",
        label: "Activos",
        count: students.filter((s) => s.status === "ACTIVE").length,
      },
      {
        key: "GRADUATED",
        label: "Egresados",
        count: students.filter((s) => s.status === "GRADUATED").length,
      },
      {
        key: "INACTIVE",
        label: "Inactivos",
        count: students.filter((s) => s.status === "INACTIVE").length,
      },
    ],
    [students],
  );

  const visibleStudents = useMemo(
    () =>
      statusFilter
        ? students.filter((s) => s.status === statusFilter)
        : students,
    [statusFilter, students],
  );

  return (
    <div className="space-y-6">
      <TableToolbar
        tabs={studentTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, DNI o legajo..."
        activeFiltersCount={(levelId ? 1 : 0) + (divisionId ? 1 : 0)}
        filtersContent={
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Nivel
              </label>
              <select
                value={levelId}
                onChange={(e) => {
                  setLevelId(e.target.value);
                  setDivisionId("");
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Todos los niveles</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                División
              </label>
              <GroupedSelect
                value={divisionId}
                onChange={setDivisionId}
                groups={divisionGroups}
                allLabel="Todas las divisiones"
              />
            </div>
          </div>
        }
        actions={[
          {
            label: "Nuevo Alumno",
            primary: true,
            onClick: () => setShowStudentModal(true),
          },
          {
            label: "Nuevo Responsable",
            onClick: () => setShowGuardianModal(true),
          },
        ]}
      />

      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">DNI</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3">Responsable</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading && !hasLoadedOnce ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando alumnos...
                  </td>
                </tr>
              ) : visibleStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron alumnos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                visibleStudents.map((st) => {
                  const mainGuardian =
                    st.guardians.find((g) => g.isFinancialResponsible)
                      ?.guardian ?? st.guardians[0]?.guardian;
                  return (
                    <tr
                      key={st.id}
                      onClick={() => router.push(`/admin/alumnos/${st.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {st.legajo}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={st.photoUrl}
                            name={`${st.firstName} ${st.lastName}`}
                            size="md"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/admin/alumnos/${st.id}`}
                                className="hover:text-brand-600 hover:underline"
                              >
                                {st.lastName}, {st.firstName}
                              </Link>
                              {st.scholarships.length > 0 ? (
                                <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] font-normal text-gray-600 dark:border-gray-700 dark:text-gray-300">
                                  Beca
                                </span>
                              ) : null}
                            </div>
                            {st.address ? (
                              <div className="text-xs font-normal text-gray-500">
                                {st.address}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {st.dni}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {st.division
                          ? `${st.division.grade.level.name} - ${st.division.grade.name} ${st.division.name}`
                          : "Sin asignar"}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                        {mainGuardian ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={mainGuardian.photoUrl}
                              name={`${mainGuardian.firstName} ${mainGuardian.lastName}`}
                              size="sm"
                            />
                            <div>
                              <div>
                                {mainGuardian.lastName}, {mainGuardian.firstName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {mainGuardian.whatsapp ||
                                  mainGuardian.phone ||
                                  mainGuardian.email ||
                                  "Sin contacto"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          "Sin vincular"
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
                            const menuHeight = 92;
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
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
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

      {showStudentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nuevo Alumno
              </h2>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Nombre
                  </label>
                  <input
                    required
                    value={stFirstName}
                    onChange={(e) => setStFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Apellido
                  </label>
                  <input
                    required
                    value={stLastName}
                    onChange={(e) => setStLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    DNI
                  </label>
                  <input
                    required
                    value={stDni}
                    onChange={(e) => setStDni(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Fecha de nacimiento
                  </label>
                  <input
                    required
                    type="date"
                    value={stBirthDate}
                    onChange={(e) => setStBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Legajo (opcional)
                  </label>
                  <input
                    value={stLegajo}
                    onChange={(e) => setStLegajo(e.target.value)}
                    placeholder="Auto si queda vacío"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    División
                  </label>
                  <select
                    value={stDivisionId}
                    onChange={(e) => setStDivisionId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Sin asignar</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.grade.level.name} - {d.grade.name} {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Responsable (opcional)
                  </label>
                  <select
                    value={stGuardianId}
                    onChange={(e) => setStGuardianId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="">Sin vincular</option>
                    {guardians.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.lastName}, {g.firstName} (DNI {g.dni})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Vínculo
                  </label>
                  <input
                    value={stRelationship}
                    onChange={(e) => setStRelationship(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    URL de foto (opcional)
                  </label>
                  <input
                    value={stPhotoUrl}
                    onChange={(e) => setStPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Grupo sanguíneo (opcional)
                  </label>
                  <input
                    value={stBloodType}
                    onChange={(e) => setStBloodType(e.target.value)}
                    placeholder="Ej. O+, A+"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Domicilio (opcional)
                  </label>
                  <input
                    value={stAddress}
                    onChange={(e) => setStAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Contacto de emergencia
                  </label>
                  <input
                    value={stEmergencyContact}
                    onChange={(e) => setStEmergencyContact(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Teléfono de emergencia
                  </label>
                  <input
                    value={stEmergencyPhone}
                    onChange={(e) => setStEmergencyPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Alergias / Notas médicas
                  </label>
                  <input
                    value={stAllergiesNotes}
                    onChange={(e) => setStAllergiesNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={stObservations}
                  onChange={(e) => setStObservations(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar Alumno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showGuardianModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nuevo Responsable / Tutor
              </h2>
              <button
                type="button"
                onClick={() => setShowGuardianModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateGuardian} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Nombre
                  </label>
                  <input
                    required
                    value={gdFirstName}
                    onChange={(e) => setGdFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Apellido
                  </label>
                  <input
                    required
                    value={gdLastName}
                    onChange={(e) => setGdLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    DNI
                  </label>
                  <input
                    required
                    value={gdDni}
                    onChange={(e) => setGdDni(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={gdEmail}
                    onChange={(e) => setGdEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Teléfono
                  </label>
                  <input
                    value={gdPhone}
                    onChange={(e) => setGdPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    WhatsApp
                  </label>
                  <input
                    value={gdWhatsapp}
                    onChange={(e) => setGdWhatsapp(e.target.value)}
                    placeholder="+54911..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Domicilio
                </label>
                <input
                  value={gdAddress}
                  onChange={(e) => setGdAddress(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={gdCreateAccount}
                  onChange={(e) => setGdCreateAccount(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600"
                />
                Crear cuenta de acceso al Portal de Familias
              </label>

              {gdCreateAccount ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Contraseña inicial (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={gdPassword}
                    onChange={(e) => setGdPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGuardianModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar Responsable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {openMenu ? (
        (() => {
          const st = students.find((s) => s.id === openMenu.id);
          if (!st) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <Link
                href={`/admin/alumnos/${st.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver legajo completo
              </Link>
              <Link
                href={
                  st.division
                    ? `/admin/cuotas?divisionId=${st.division.id}`
                    : "/admin/cuotas"
                }
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
                Ver cuotas
              </Link>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
