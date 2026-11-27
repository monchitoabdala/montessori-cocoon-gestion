"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

interface AcademicYearItem {
  id: string;
  year: number;
  name: string;
  isActive: boolean;
  siblingDiscountPct: string | number;
  siblingDiscountMinChildren: number;
}

interface LevelItem {
  id: string;
  name: string;
}

interface GradeItem {
  id: string;
  name: string;
  monthlyFeeAmount: string | number;
  enrollmentFeeAmount: string | number;
  level: { id: string; name: string };
  academicYear: { id: string };
}

function formatARS(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export default function AdminConfigArancelesPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLevelId, setCreateLevelId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createMonthlyFee, setCreateMonthlyFee] = useState("");
  const [createEnrollmentFee, setCreateEnrollmentFee] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit modal
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editMonthlyFee, setEditMonthlyFee] = useState("");
  const [editEnrollmentFee, setEditEnrollmentFee] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/structure", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al cargar aranceles");
      }
      setAcademicYears(json.academicYears ?? []);
      const lvls: LevelItem[] = json.levels ?? [];
      setLevels(lvls);
      if (lvls.length > 0 && !createLevelId) {
        setCreateLevelId(lvls[0].id);
      }
      setGrades(json.grades ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar aranceles",
      );
    } finally {
      setLoading(false);
    }
  }, [createLevelId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openEditModal(grade: GradeItem) {
    setEditingGrade(grade);
    setEditName(grade.name);
    setEditMonthlyFee(String(Number(grade.monthlyFeeAmount)));
    setEditEnrollmentFee(String(Number(grade.enrollmentFeeAmount)));
  }

  async function handleCreateGrade(e: FormEvent) {
    e.preventDefault();
    setSubmittingCreate(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_GRADE",
          levelId: createLevelId,
          name: createName.trim(),
          monthlyFeeAmount: Number(createMonthlyFee),
          enrollmentFeeAmount: Number(createEnrollmentFee),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el arancel");
      }
      setShowCreateModal(false);
      setCreateName("");
      setCreateMonthlyFee("");
      setCreateEnrollmentFee("");
      setFeedback("Nuevo arancel / grado creado correctamente.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear arancel",
      );
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function handleUpdateGrade(e: FormEvent) {
    e.preventDefault();
    if (!editingGrade) return;
    setSubmittingEdit(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/structure", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeId: editingGrade.id,
          name: editName.trim(),
          monthlyFeeAmount: Number(editMonthlyFee),
          enrollmentFeeAmount: Number(editEnrollmentFee),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar el arancel");
      }
      setEditingGrade(null);
      setFeedback(`Arancel "${editName.trim()}" actualizado.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar arancel",
      );
    } finally {
      setSubmittingEdit(false);
    }
  }

  const activeYear =
    academicYears.find((y) => y.isActive) ?? academicYears[0] ?? null;
  const activeGrades = activeYear
    ? grades.filter((g) => g.academicYear.id === activeYear.id)
    : grades;

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-emerald-800 hover:underline"
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
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Becas y Descuento por Hermanos
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Descuento 2do Hermano
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              {activeYear
                ? `${Number(activeYear.siblingDiscountPct)}%`
                : "10%"}
            </div>
            <div className="text-xs text-gray-500">
              Aplicado automáticamente desde{" "}
              {activeYear?.siblingDiscountMinChildren ?? 2} hijos activos
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Descuento 3er Hermano o más
            </div>
            <div className="mt-1 font-semibold text-gray-900">15%</div>
            <div className="text-xs text-gray-500">
              Bonificación progresiva en cuota mensual
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Becas Individuales
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              Porcentaje o Monto Fijo
            </div>
            <div className="text-xs text-gray-500">
              Configurables en el legajo de cada alumno
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Grilla de Aranceles y Matrículas
            </h2>
            <p className="text-xs text-gray-500">
              Valores base vigentes por ambiente y grado en pesos argentinos
              (ARS).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-700"
          >
            + Nuevo Arancel / Grado
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Ambiente / Nivel</th>
                <th className="px-5 py-3">Grado / Etapa</th>
                <th className="px-5 py-3 text-right">Cuota Mensual</th>
                <th className="px-5 py-3 text-right">Matrícula Anual</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando aranceles...
                  </td>
                </tr>
              ) : activeGrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No hay aranceles configurados.
                  </td>
                </tr>
              ) : (
                activeGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-gray-600">
                      {grade.level.name}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {grade.name}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatARS(grade.monthlyFeeAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {formatARS(grade.enrollmentFeeAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(grade)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Nuevo Arancel / Grado
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateGrade} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Ambiente / Nivel
                </label>
                <select
                  required
                  value={createLevelId}
                  onChange={(e) => setCreateLevelId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nombre del Grado / Etapa
                </label>
                <input
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ej. Taller III"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Cuota Mensual (ARS)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={createMonthlyFee}
                    onChange={(e) => setCreateMonthlyFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Matrícula Anual (ARS)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={createEnrollmentFee}
                    onChange={(e) => setCreateEnrollmentFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingCreate ? "Guardando..." : "Crear Arancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingGrade ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Editar Arancel
                </h2>
                <p className="text-xs text-gray-500">
                  {editingGrade.level.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGrade(null)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleUpdateGrade} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nombre del Grado / Etapa
                </label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Cuota Mensual (ARS)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Matrícula Anual (ARS)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editEnrollmentFee}
                    onChange={(e) => setEditEnrollmentFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {submittingEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
