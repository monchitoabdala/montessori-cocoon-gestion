"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface LinkedStudent {
  relationship: string;
  isFinancialResponsible: boolean;
  student: {
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
    status: string;
    photoUrl?: string | null;
    division: {
      id: string;
      name: string;
      grade: { id: string; name: string; level?: { name: string } };
    } | null;
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
  address: string | null;
  photoUrl?: string | null;
  students: LinkedStudent[];
}

interface StudentOption {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  division: { name: string; grade: { name: string } } | null;
}

export default function AdminTutoresPage() {
  const router = useRouter();
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<{
    id: string;
    top: number;
    right: number;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<GuardianItem | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

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

  const loadGuardians = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/guardians?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al listar tutores");
      }
      setGuardians(json.guardians ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al listar tutores");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadGuardians();
  }, [loadGuardians]);

  useEffect(() => {
    async function loadStudents() {
      const res = await fetch("/api/students", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setAllStudents(json.students ?? []);
      }
    }
    void loadStudents();
  }, []);

  function openCreateModal() {
    setEditingGuardian(null);
    setFirstName("");
    setLastName("");
    setDni("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setAddress("");
    setPhotoUrl("");
    setSelectedStudentIds([]);
    setShowModal(true);
  }

  function openEditModal(g: GuardianItem) {
    setEditingGuardian(g);
    setFirstName(g.firstName);
    setLastName(g.lastName);
    setDni(g.dni);
    setEmail(g.email ?? "");
    setPhone(g.phone ?? "");
    setWhatsapp(g.whatsapp ?? "");
    setAddress(g.address ?? "");
    setPhotoUrl(g.photoUrl ?? "");
    setSelectedStudentIds(g.students.map((s) => s.student.id));
    setShowModal(true);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dni: dni.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim() || null,
        photoUrl: photoUrl.trim() || null,
        studentIds: selectedStudentIds,
      };

      const url = editingGuardian
        ? `/api/guardians/${editingGuardian.id}`
        : "/api/guardians";
      const method = editingGuardian ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar el tutor");
      }

      setShowModal(false);
      setFeedback(
        editingGuardian
          ? `Tutor ${lastName}, ${firstName} actualizado.`
          : `Tutor ${lastName}, ${firstName} creado correctamente.`,
      );
      await loadGuardians();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar tutor");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyWhatsApp(g: GuardianItem) {
    const number = g.whatsapp || g.phone || "";
    const text = number || `${g.firstName} ${g.lastName}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard failure
    }
    setCopiedId(g.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === g.id ? null : prev));
      setOpenMenu((prev) => (prev?.id === g.id ? null : prev));
    }, 900);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tutor por nombre, DNI o email..."
          className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none"
        />

        <button
          type="button"
          onClick={openCreateModal}
          className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nuevo Tutor
        </button>
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

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Tutor / Padre</th>
                <th className="px-5 py-3">DNI</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Hijos / Alumnos Vinculados</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando tutores...
                  </td>
                </tr>
              ) : guardians.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron tutores.
                  </td>
                </tr>
              ) : (
                guardians.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => router.push(`/admin/tutores/${g.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={g.photoUrl}
                          name={`${g.firstName} ${g.lastName}`}
                          size="md"
                        />
                        <div>
                          <div>
                            {g.lastName}, {g.firstName}
                          </div>
                          {g.address ? (
                            <div className="text-xs font-normal text-gray-500">
                              {g.address}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{g.dni}</td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{g.email || "Sin email"}</div>
                      <div className="text-xs text-gray-500">
                        {g.whatsapp || g.phone || "Sin teléfono"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {g.students.length === 0 ? (
                        <span className="text-xs text-gray-400">
                          Sin alumnos vinculados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {g.students.map((link) => (
                            <Link
                              key={link.student.id}
                              href={`/admin/alumnos/${link.student.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-1 pr-2.5 text-xs font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50/50"
                            >
                              <Avatar
                                src={link.student.photoUrl}
                                name={`${link.student.firstName} ${link.student.lastName}`}
                                size="sm"
                                className="size-5 text-[9px]"
                              />
                              <span>
                                {link.student.lastName},{" "}
                                {link.student.firstName}
                              </span>
                              {link.student.division ? (
                                <span className="text-gray-400">
                                  ({link.student.division.grade.name}{" "}
                                  {link.student.division.name})
                                </span>
                              ) : null}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={g.students.length > 0 ? "ACTIVE" : "SIN_HIJOS"}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        aria-label="Acciones"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenu?.id === g.id) {
                            setOpenMenu(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 96;
                          const openUp =
                            rect.bottom + menuHeight > window.innerHeight;
                          setOpenMenu({
                            id: g.id,
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
          const g = guardians.find((item) => item.id === openMenu.id);
          if (!g) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: openMenu.top, right: openMenu.right }}
              className="fixed z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            >
              <Link
                href={`/admin/tutores/${g.id}`}
                onClick={() => setOpenMenu(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Ver ficha familiar
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  openEditModal(g);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                Vincular / Editar
              </button>
              <button
                type="button"
                onClick={() => void handleCopyWhatsApp(g)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copiedId === g.id ? (
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
                    Copiar WhatsApp
                  </>
                )}
              </button>
            </div>
          );
        })()
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingGuardian ? "Editar / Vincular Tutor" : "Nuevo Tutor"}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    WhatsApp
                  </label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Domicilio
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
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
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Alumnos vinculados
                </label>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                  {allStudents.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 text-xs text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(st.id)}
                        onChange={() => toggleStudent(st.id)}
                        className="rounded border-gray-300 text-brand-600"
                      />
                      <span>
                        {st.lastName}, {st.firstName} (Legajo {st.legajo}
                        {st.division
                          ? ` - ${st.division.grade.name} ${st.division.name}`
                          : ""}
                        )
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
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
