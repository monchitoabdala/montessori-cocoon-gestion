"use client";

export default function AdminConfigIntegracionesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Integraciones Activas
          </h2>
          <p className="text-xs text-gray-500">
            Pasarelas de cobro online y canales de notificación a familias.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Mercado Pago Checkout Pro
                </h3>
                <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  Sandbox / Local
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Genera preferencias de pago para el Portal de Familias y acredita
                automáticamente los recibos mediante webhook.
              </p>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
              Endpoint: /api/mercadopago/webhook
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Correo SMTP (Nodemailer)
                </h3>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Operativo
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Envía recordatorios de cuotas pendientes y vencidas con remitente
                contacto@montessoricocoon.edu.ar.
              </p>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
              Fallback local simulado si SMTP no está configurado
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  WhatsApp Directo (wa.me)
                </h3>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Operativo
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Copia recordatorios listos para pegar o abre enlaces wa.me con
                el detalle de saldo pendiente en ARS.
              </p>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
              Registrado en NotificationLog
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
