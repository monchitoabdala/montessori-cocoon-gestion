"use client";

const ROLES_MATRIX = [
  {
    role: "Dirección (ADMIN)",
    email: "admin@montessoricocoon.edu.ar",
    scope: "Acceso total",
    permissions: [
      "Panel ejecutivo y métricas de cobranza",
      "Alta y edición de alumnos, tutores, guías y personal",
      "Emisión masiva de cuotas, mora, caja y recibos PDF",
      "Aprobación de vacaciones, licencias y liquidación de sueldos",
      "Configuración institucional y aranceles",
    ],
  },
  {
    role: "Secretaría / Tesorería (STAFF)",
    email: "secretaria@montessoricocoon.edu.ar",
    scope: "Operación administrativa",
    permissions: [
      "Gestión de padrón de alumnos y tutores",
      "Cobros en caja, emisión de recibos PDF y recordatorios",
      "Registro de asistencias y consulta de boletines",
    ],
  },
  {
    role: "Guías Montessori (TEACHER)",
    email: "guia.garcia@montessoricocoon.edu.ar",
    scope: "Ambientes asignados",
    permissions: [
      "Vista de cursos y alumnos a cargo",
      "Carga diaria de asistencia por ambiente",
      "Carga de calificaciones y observaciones en boletines",
    ],
  },
  {
    role: "Familias / Tutores (GUARDIAN)",
    email: "familia.rodriguez@gmail.com",
    scope: "Hijos vinculados",
    permissions: [
      "Consulta de estado de cuenta y cuotas en ARS",
      "Pago online vía Mercado Pago y descarga de recibos PDF",
      "Seguimiento de asistencias y boletines académicos",
    ],
  },
];

export default function AdminConfigUsuariosPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Matriz de Roles y Permisos
          </h2>
          <p className="text-xs text-gray-500">
            Perfiles de acceso habilitados en Escuela Montessori Cocoon.
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {ROLES_MATRIX.map((item) => (
            <div
              key={item.role}
              className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {item.role}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  Ejemplo: {item.email}
                </div>
                <span className="mt-2 inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {item.scope}
                </span>
              </div>

              <ul className="space-y-1 text-sm text-gray-600 lg:col-span-2">
                {item.permissions.map((perm) => (
                  <li key={perm} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-brand-600" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
