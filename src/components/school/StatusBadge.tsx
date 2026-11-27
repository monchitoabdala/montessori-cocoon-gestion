import { cn } from "@/utils";

export type StatusCategory =
  | "fee"
  | "student"
  | "attendance"
  | "paymentMethod"
  | "paymentStatus"
  | "leave";

interface StatusStyle {
  label: string;
  classes: string;
}

const STATUS_MAP: Record<string, StatusStyle> = {
  // FeeStatus
  PENDING: {
    label: "Pendiente",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  PAID: {
    label: "Pagada",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  OVERDUE: {
    label: "Vencida",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
  PARTIAL: {
    label: "Parcial",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  },
  CANCELLED: {
    label: "Anulada",
    classes:
      "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },

  // StudentStatus
  ACTIVE: {
    label: "Activo",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  GRADUATED: {
    label: "Egresado",
    classes:
      "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
  },
  INACTIVE: {
    label: "Inactivo",
    classes:
      "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },

  // AttendanceStatus
  PRESENT: {
    label: "Presente",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  ABSENT: {
    label: "Ausente",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
  LATE: {
    label: "Tarde",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  EXCUSED: {
    label: "Justificado",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  },

  // PaymentMethod
  CASH: {
    label: "Efectivo",
    classes:
      "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  TRANSFER: {
    label: "Transferencia",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  },
  CARD: {
    label: "Tarjeta",
    classes:
      "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300",
  },
  MERCADOPAGO: {
    label: "Mercado Pago",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  },

  // PaymentStatus
  COMPLETED: {
    label: "Acreditado",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  // Employee Leaves
  APPROVED: {
    label: "Aprobada",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Rechazada",
    classes:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },

  // Account / Billing Summary
  AL_DIA: {
    label: "Al día",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CON_DEUDA: {
    label: "Con deuda",
    classes:
      "border-red-200 bg-red-50 text-red-700",
  },
  PENDIENTE: {
    label: "Pendiente",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  // Courses / Divisions
  CON_VACANTES: {
    label: "Con vacantes",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  COMPLETO: {
    label: "Completo",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700",
  },
  SIN_DOCENTE: {
    label: "Sin docente",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  // Teachers / Guardians
  CON_CURSOS: {
    label: "Con cursos",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  SIN_ASIGNAR: {
    label: "Sin asignar",
    classes:
      "border-gray-200 bg-gray-100 text-gray-600",
  },
  SIN_HIJOS: {
    label: "Sin hijos vinculados",
    classes:
      "border-gray-200 bg-gray-100 text-gray-600",
  },
  SIN_VINCULAR: {
    label: "Sin hijos vinculados",
    classes:
      "border-gray-200 bg-gray-100 text-gray-600",
  },
};

export interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  category,
  size = "sm",
  className,
}: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  let config = STATUS_MAP[normalized];

  // Handle overlapping PENDING between FeeStatus and PaymentStatus
  if (category === "paymentStatus" && normalized === "PENDING") {
    config = {
      label: "En proceso",
      classes: STATUS_MAP.PENDING.classes,
    };
  }
  if (category === "paymentStatus" && normalized === "REJECTED") {
    config = {
      label: "Rechazado",
      classes: STATUS_MAP.REJECTED.classes,
    };
  }

  const label = config?.label ?? status;
  const colorClasses =
    config?.classes ??
    "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  );
}
