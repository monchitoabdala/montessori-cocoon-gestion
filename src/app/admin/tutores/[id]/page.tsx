"use client";

import { Avatar } from "@/components/school/Avatar";
import { StatusBadge } from "@/components/school/StatusBadge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface FeeChargeItem {
  id: string;
  period: string;
  description: string;
  dueDate: string;
  finalAmount: string | number;
  paidAmount: string | number;
  status: string;
}

interface LinkedStudentDetail {
  relationship: string;
  isFinancialResponsible: boolean;
  student: {
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    status: string;
    division: {
      id: string;
      name: string;
      grade: {
        name: string;
        level: { name: string };
      };
    } | null;
    feeCharges: FeeChargeItem[];
  };
}

interface GuardianDetail {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  photoUrl: string | null;
  students: LinkedStudentDetail[];
}

interface StudentOption {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  division: { name: string; grade: { name: string } } | null;
}

function formatARS(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDateAR(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminTutorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const guardianId = params?.id;

  const [guardian, setGuardian] = useState<GuardianDetail | null>(null);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [savingLink, setSavingLink] = useState(false);

  const loadGuardian = useCallback(async () => {
    if (!guardianId) return;
    setLoading(true);
    setError(null);
    try {
      const [gRes, sRes] = await Promise.all([
        fetch(`/api/guardians/${guardianId}`, { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ]);
      const gJson = await gRes.json();
      if (!gRes.ok) {
        throw new Error(gJson.error || "No se pudo cargar el tutor");
      }
      setGuardian(gJson.guardian);
      setSelectedStudentIds(
        (gJson.guardian?.students ?? []).map(
          (s: LinkedStudentDetail) => s.student.id,
        ),
      );
      if (sRes.ok) {
        const sJson = await sRes.json();
        setAllStudents(sJson.students ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el tutor",
      );
    } finally {
      setLoading(false);
    }
  }, [guardianId]);

  useEffect(() => {
    void loadGuardian();
  }, [loadGuardian]);

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSaveLinks(e: FormEvent) {
    e.preventDefault();
    if (!guardianId) return;
    setSavingLink(true);
    setError(null);
    try {
      const res = await fetch(`/api/guardians/${guardianId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudieron vincular los alumnos");
      }
      setShowLinkModal(false);
      setFeedback("Vínculos familiares actualizados.");
      await loadGuardian();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al vincular alumnos",
      );
    } finally {
      setSavingLink(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Cargando ficha familiar...
      </div>
    );
  }

  if (error && !guardian) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/tutores"
          className="inline-flex text-sm font-medium text-brand-600 hover:underline"
        >
          Volver a Tutores
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!guardian) return null;

  const allFees = guardian.students.flatMap((link) =>
    link.student.feeCharges.map((fee) => ({
      ...fee,
      studentId: link.student.id,
      studentName: `${link.student.lastName}, ${link.student.firstName}`,
      studentPhoto: link.student.photoUrl,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/tutores"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver a Tutores
        </Link>

        <button
          type="button"
          onClick={() => setShowLinkModal(true)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          Vincular Alumno
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

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={guardian.photoUrl}
              name={`${guardian.firstName} ${guardian.lastName}`}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-semibold text-gray-900">
                  {guardian.lastName}, {guardian.firstName}
                </span>
                <StatusBadge
                  status={guardian.students.length > 0 ? "ACTIVE" : "SIN_HIJOS"}
                />
              </div>
              <div className="mt-0.5 text-sm text-gray-500">
                DNI {guardian.dni} · {guardian.address || "Sin domicilio"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">Email</div>
            <div className="mt-0.5 text-gray-900">
              {guardian.email || "No informado"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">Teléfono</div>
            <div className="mt-0.5 text-gray-900">
              {guardian.phone || "No informado"}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-500">WhatsApp</div>
            <div className="mt-0.5 text-gray-900">
              {guardian.whatsapp || "No informado"}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Hijos / Alumnos vinculados ({guardian.students.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Curso</th>
                <th className="px-5 py-3">Vínculo</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {guardian.students.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    No hay alumnos vinculados a este tutor.
                  </td>
                </tr>
              ) : (
                guardian.students.map((link) => (
                  <tr
                    key={link.student.id}
                    onClick={() =>
                      router.push(`/admin/alumnos/${link.student.id}`)
                    }
                    className="cursor-pointer transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {link.student.legajo}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={link.student.photoUrl}
                          name={`${link.student.firstName} ${link.student.lastName}`}
                          size="sm"
                        />
                        <span>
                          {link.student.lastName}, {link.student.firstName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {link.student.division
                        ? `${link.student.division.grade.level.name} · ${link.student.division.grade.name} ${link.student.division.name}`
                        : "Sin asignar"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {link.relationship}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={link.student.status}
                        category="student"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Estado de cuenta familiar
          </h2>
          <Link
            href="/admin/cuotas"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Ir a Cuotas y Caja
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Período / Concepto</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-right">Final</th>
                <th className="px-5 py-3 text-right">Saldo</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allFees.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-6 text-center text-sm text-gray-500"
                  >
                    Sin cuotas registradas.
                  </td>
                </tr>
              ) : (
                allFees.map((fee) => {
                  const balance = Math.max(
                    0,
                    Number(fee.finalAmount) - Number(fee.paidAmount),
                  );
                  return (
                    <tr key={fee.id}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={fee.studentPhoto}
                            name={fee.studentName}
                            size="sm"
                          />
                          <span>{fee.studentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        <div>{fee.description}</div>
                        <div className="text-xs text-gray-500">
                          {fee.period}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {formatDateAR(fee.dueDate)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {formatARS(fee.finalAmount)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {formatARS(balance)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={fee.status} category="fee" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showLinkModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Vincular Alumnos
              </h2>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveLinks} className="space-y-4">
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {allStudents.map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
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
                        ? ` · ${st.division.grade.name} ${st.division.name}`
                        : ""}
                      )
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingLink ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
