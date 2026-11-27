"use client";

import { useState } from "react";

interface AutomationRule {
  id: string;
  title: string;
  description: string;
  schedule: string;
  channel: string;
  enabled: boolean;
}

const INITIAL_RULES: AutomationRule[] = [
  {
    id: "auto-fees",
    title: "Generación automática de cuotas mensuales",
    description:
      "Emite los aranceles del período para alumnos activos aplicando becas vigentes y descuentos por hermanos.",
    schedule: "Día 1 de cada mes · 08:00 hs",
    channel: "Facturación",
    enabled: true,
  },
  {
    id: "auto-late-fee",
    title: "Aplicación automática de recargo por mora",
    description:
      "Actualiza el estado de cuotas impagas tras el vencimiento y aplica el porcentaje de recargo configurado en el ciclo lectivo.",
    schedule: "Día 11 de cada mes · 09:00 hs",
    channel: "Cobranzas",
    enabled: true,
  },
  {
    id: "auto-reminders",
    title: "Recordatorios de vencimiento por Email / WhatsApp",
    description:
      "Envía aviso preventivo a los tutores responsables financieros antes de la fecha de vencimiento de cada cuota.",
    schedule: "48 hs antes del vencimiento",
    channel: "Email y WhatsApp",
    enabled: true,
  },
  {
    id: "auto-mp-receipt",
    title: "Aviso automático de recibo PDF al confirmar pago por Mercado Pago",
    description:
      "Al acreditarse el webhook de Mercado Pago, genera el comprobante PDF y notifica al responsable financiero.",
    schedule: "En tiempo real (Webhook)",
    channel: "Mercado Pago + Email",
    enabled: true,
  },
  {
    id: "auto-leave-alert",
    title: "Alerta a Dirección ante solicitudes de vacaciones pendientes",
    description:
      "Destaca en la campana de notificaciones las licencias y vacaciones pendientes de aprobación.",
    schedule: "Inmediato al registrar solicitud",
    channel: "Panel Ejecutivo",
    enabled: false,
  },
];

export default function AdminConfigAutomatizacionesPage() {
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
  }

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Automatizaciones del Colegio
            </h2>
            <p className="text-xs text-gray-500">
              Reglas programadas de facturación, cobranzas, notificaciones y
              recursos humanos.
            </p>
          </div>
          <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
            {activeCount} de {rules.length} activas
          </span>
        </div>

        <div className="divide-y divide-gray-200">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {rule.title}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                      rule.enabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
                  >
                    {rule.enabled ? "Activa" : "Pausada"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{rule.description}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
                  <span>Frecuencia: {rule.schedule}</span>
                  <span>·</span>
                  <span>Módulo: {rule.channel}</span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={rule.title}
                onClick={() => toggleRule(rule.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                  rule.enabled
                    ? "border-brand-600 bg-brand-600"
                    : "border-gray-300 bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? "translate-x-5.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
