"use client";

import { useEffect, useState } from "react";

interface AcademicYearItem {
  id: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  lateFeePct: string | number;
  siblingDiscountPct: string | number;
}

function formatDateAR(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminConfigCicloLectivoPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/structure", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Error al cargar ciclo lectivo");
        }
        setAcademicYears(json.academicYears ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar ciclo lectivo",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const activeYear =
    academicYears.find((y) => y.isActive) ?? academicYears[0] ?? null;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Ciclo Lectivo Activo
          </h2>
          {activeYear ? (
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {activeYear.isActive ? "Activo" : "Inactivo"}
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">
            Cargando ciclo lectivo...
          </p>
        ) : !activeYear ? (
          <p className="mt-4 text-sm text-gray-500">
            No hay ciclos lectivos configurados.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-3.5">
              <div className="text-xs font-medium text-gray-500">Nombre</div>
              <div className="mt-1 font-semibold text-gray-900">
                {activeYear.name} ({activeYear.year})
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3.5">
              <div className="text-xs font-medium text-gray-500">
                Fecha de Inicio
              </div>
              <div className="mt-1 font-medium text-gray-900">
                {formatDateAR(activeYear.startDate)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3.5">
              <div className="text-xs font-medium text-gray-500">
                Fecha de Cierre
              </div>
              <div className="mt-1 font-medium text-gray-900">
                {formatDateAR(activeYear.endDate)}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Reglas de Vencimiento y Mora
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Vencimiento Estándar
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              Día 10 de cada mes
            </div>
            <div className="text-xs text-gray-500">
              Configurable al generar cuotas mensuales
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Recargo por Mora
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              {activeYear ? `${Number(activeYear.lateFeePct)}%` : "10%"}
            </div>
            <div className="text-xs text-gray-500">
              Aplicado sobre el saldo vencido desde Cuotas y Caja
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Períodos Académicos
            </div>
            <div className="mt-1 font-semibold text-gray-900">
              3 Trimestres + Anual
            </div>
            <div className="text-xs text-gray-500">
              1er Trimestre, 2do Trimestre, 3er Trimestre y cierre Anual
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
