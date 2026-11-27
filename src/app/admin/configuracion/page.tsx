"use client";

import { useEffect, useState } from "react";

interface AcademicYearItem {
  id: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  siblingDiscountPct: string | number;
  siblingDiscountMinChildren: number;
  lateFeePct: string | number;
}

interface GradeItem {
  id: string;
  name: string;
  order: number;
  monthlyFeeAmount: string | number;
  enrollmentFeeAmount: string | number;
  level: { id: string; name: string; order: number };
  academicYear: { id: string; year: number; name: string; isActive: boolean };
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

export default function AdminConfiguracionPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/structure", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Error al cargar configuración");
        }
        setAcademicYears(json.academicYears ?? []);
        setGrades(json.grades ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar configuración",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadConfig();
  }, []);

  const activeYear =
    academicYears.find((y) => y.isActive) ?? academicYears[0] ?? null;

  const activeGrades = activeYear
    ? grades.filter((g) => g.academicYear.id === activeYear.id)
    : grades;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/images/logo-cocoon.png"
              alt="Escuela Montessori Cocoon"
              className="h-12 w-auto shrink-0 object-contain"
            />
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Escuela Montessori Cocoon
              </h2>
              <p className="text-xs text-gray-500">
                Institución Educativa · Funes, Santa Fe
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="font-medium text-gray-500">Dirección</div>
              <div className="mt-0.5 text-gray-900">
                RN9 4115, Funes, Santa Fe
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="font-medium text-gray-500">Email</div>
              <div className="mt-0.5 text-gray-900">
                contacto@montessoricocoon.edu.ar
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 px-3 py-2">
              <div className="font-medium text-gray-500">Teléfono</div>
              <div className="mt-0.5 text-gray-900">+54 9 341 201 1300</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Ciclo Lectivo Activo
            </h2>
            {activeYear ? (
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                  activeYear.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-100 text-gray-600"
                }`}
              >
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
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">Ciclo</div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  {activeYear.name} ({activeYear.year})
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">Inicio</div>
                <div className="mt-0.5 font-medium text-gray-900">
                  {formatDateAR(activeYear.startDate)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">Cierre</div>
                <div className="mt-0.5 font-medium text-gray-900">
                  {formatDateAR(activeYear.endDate)}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Reglas de Cobranza
            </h2>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Cargando reglas...</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">
                  Descuento por Hermanos
                </div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  {activeYear
                    ? `${Number(activeYear.siblingDiscountPct)}%`
                    : "10% / 15%"}
                </div>
                <div className="text-xs text-gray-500">
                  Desde {activeYear?.siblingDiscountMinChildren ?? 2} hijos
                  activos
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">
                  Recargo por Mora
                </div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  {activeYear ? `${Number(activeYear.lateFeePct)}%` : "10%"}
                </div>
                <div className="text-xs text-gray-500">
                  Aplicable tras vencimiento
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500">
                  Vencimiento Estándar
                </div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  Día 10 de cada mes
                </div>
                <div className="text-xs text-gray-500">
                  Configurable al emitir cuotas
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Grilla de Aranceles y Matrículas
          </h2>
          <p className="text-xs text-gray-500">
            Valores base vigentes por nivel y curso en pesos argentinos (ARS).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3">Nivel</th>
                <th className="px-5 py-3">Grado / Curso</th>
                <th className="px-5 py-3 text-right">Cuota Mensual</th>
                <th className="px-5 py-3 text-right">Matrícula Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando aranceles...
                  </td>
                </tr>
              ) : activeGrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Integraciones
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Mercado Pago Checkout Pro
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Cobro online para familias desde el Portal Familiar con
                acreditación automática vía webhook.
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
              Modo Local / Sandbox
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Correo SMTP y Notificaciones
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Envío de recordatorios de vencimiento por Email (Nodemailer) y
                enlaces directos de WhatsApp.
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Operativo
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
