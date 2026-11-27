"use client";

export default function AdminConfiguracionPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-5 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/images/logo-cocoon.png"
              alt="Escuela Montessori Cocoon"
              className="h-14 w-auto shrink-0 object-contain"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Escuela Montessori Cocoon
              </h2>
              <p className="text-sm text-gray-500">
                Institución Educativa · Funes, Santa Fe
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Institución Activa
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">Dirección</div>
            <div className="mt-1 font-medium text-gray-900">
              RN9 4115, Funes, Santa Fe
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Email Institucional
            </div>
            <div className="mt-1 font-medium text-gray-900">
              contacto@montessoricocoon.edu.ar
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">Teléfono</div>
            <div className="mt-1 font-medium text-gray-900">
              +54 9 341 201 1300
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">CUIT</div>
            <div className="mt-1 font-mono font-medium text-gray-900">
              30-71654321-9
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">
              Jurisdicción
            </div>
            <div className="mt-1 font-medium text-gray-900">
              Ministerio de Educación · Santa Fe
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-xs font-medium text-gray-500">Moneda</div>
            <div className="mt-1 font-medium text-gray-900">
              Pesos Argentinos (ARS)
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Ambientes y Niveles Pedagógicos
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-sm font-semibold text-gray-900">
              Comunidad Infantil
            </div>
            <div className="mt-1 text-xs text-gray-500">
              0 a 3 años · Nido y Caminantes
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-sm font-semibold text-gray-900">
              Casa de Niños
            </div>
            <div className="mt-1 text-xs text-gray-500">
              3 a 6 años · Ambientes A, B y C
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-sm font-semibold text-gray-900">
              Taller / Primaria
            </div>
            <div className="mt-1 text-xs text-gray-500">
              6 a 12 años · Taller I y Taller II
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3.5">
            <div className="text-sm font-semibold text-gray-900">
              Comunidad de Adolescentes
            </div>
            <div className="mt-1 text-xs text-gray-500">
              12 a 18 años · Adolescentes 1, 2 y 3
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
