"use client";

import type { UserRole } from "@/lib/auth";
import { cn } from "@/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface NotificationSummaryItem {
  id: string;
  title: string;
  subtitle: string;
  category: "OVERDUE" | "LEAVE" | "FEE";
  href: string;
  date?: string;
}

export interface AppShellUser {
  userId?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AppShellProps {
  user: AppShellUser;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function IconDashboard() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconUsers({ className = "size-4.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}

function IconClipboardCheck() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function IconGraduationCap() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

function IconCalendarDays() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function IconCalendarCheck() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function IconBookOpen() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg className="size-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/admin") {
    return [{ label: "Administración" }, { label: "Resumen" }];
  }
  if (pathname === "/admin/alumnos") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Alumnos y Legajos" },
    ];
  }
  if (pathname.startsWith("/admin/alumnos/")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Alumnos y Legajos", href: "/admin/alumnos" },
      { label: "Legajo" },
    ];
  }
  if (pathname === "/admin/tutores") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Tutores y Padres" },
    ];
  }
  if (pathname.startsWith("/admin/tutores/")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Tutores y Padres", href: "/admin/tutores" },
      { label: "Ficha Familiar" },
    ];
  }
  if (pathname === "/admin/cursos") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Cursos" },
    ];
  }
  if (pathname.startsWith("/admin/cursos/")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Cursos", href: "/admin/cursos" },
      { label: "Detalle de Curso" },
    ];
  }
  if (pathname === "/admin/docentes") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Docentes" },
    ];
  }
  if (pathname.startsWith("/admin/docentes/")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Docentes", href: "/admin/docentes" },
      { label: "Ficha Docente" },
    ];
  }
  if (pathname === "/admin/empleados") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Empleados" },
    ];
  }
  if (pathname.startsWith("/admin/empleados/")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Empleados", href: "/admin/empleados" },
      { label: "Legajo" },
    ];
  }
  if (pathname.startsWith("/admin/cuotas")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Cuotas y Caja" },
    ];
  }
  if (pathname.startsWith("/admin/asistencia")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Asistencia" },
    ];
  }
  if (pathname.startsWith("/admin/boletines")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Boletines" },
    ];
  }
  if (pathname.startsWith("/admin/vacaciones")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Vacaciones" },
    ];
  }
  if (pathname.startsWith("/admin/notificaciones")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Notificaciones" },
    ];
  }
  if (pathname === "/admin/configuracion") {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Datos del Colegio" },
    ];
  }
  if (pathname.startsWith("/admin/configuracion/aranceles")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Aranceles y Becas" },
    ];
  }
  if (pathname.startsWith("/admin/configuracion/ciclo-lectivo")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Ciclo Lectivo y Mora" },
    ];
  }
  if (pathname.startsWith("/admin/configuracion/integraciones")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Integraciones" },
    ];
  }
  if (pathname.startsWith("/admin/configuracion/usuarios")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Usuarios y Roles" },
    ];
  }
  if (pathname.startsWith("/admin/configuracion/automatizaciones")) {
    return [
      { label: "Administración", href: "/admin" },
      { label: "Configuración", href: "/admin/configuracion" },
      { label: "Automatizaciones" },
    ];
  }
  if (pathname === "/docente") {
    return [{ label: "Docente" }, { label: "Mis Cursos" }];
  }
  if (pathname.startsWith("/docente/asistencia")) {
    return [{ label: "Docente", href: "/docente" }, { label: "Asistencia" }];
  }
  if (pathname.startsWith("/docente/notas")) {
    return [{ label: "Docente", href: "/docente" }, { label: "Boletines" }];
  }
  if (pathname === "/portal") {
    return [{ label: "Portal Familiar" }, { label: "Estado de Cuenta" }];
  }
  if (pathname.startsWith("/portal/academico")) {
    return [
      { label: "Portal Familiar", href: "/portal" },
      { label: "Académico" },
    ];
  }
  return [{ label: "Gestión Escolar" }];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

function getConfigNavGroup(): NavGroup {
  return {
    label: "Configuración del colegio",
    items: [
      { label: "Datos del Colegio", href: "/admin/configuracion", icon: <IconBuilding /> },
      { label: "Aranceles y Becas", href: "/admin/configuracion/aranceles", icon: <IconWallet /> },
      { label: "Ciclo Lectivo y Mora", href: "/admin/configuracion/ciclo-lectivo", icon: <IconCalendarDays /> },
      { label: "Integraciones", href: "/admin/configuracion/integraciones", icon: <IconPlug /> },
      { label: "Usuarios y Roles", href: "/admin/configuracion/usuarios", icon: <IconShield /> },
      { label: "Automatizaciones", href: "/admin/configuracion/automatizaciones", icon: <IconZap /> },
    ],
  };
}

function getNavGroupsForRole(role: UserRole): NavGroup[] {
  switch (role) {
    case "ADMIN":
    case "STAFF":
      return [
        {
          items: [
            { label: "Resumen", href: "/admin", icon: <IconDashboard /> },
          ],
        },
        {
          label: "Gestión",
          items: [
            { label: "Alumnos", href: "/admin/alumnos", icon: <IconUsers /> },
            { label: "Tutores / Padres", href: "/admin/tutores", icon: <IconUserCheck /> },
            { label: "Cursos", href: "/admin/cursos", icon: <IconBookOpen /> },
            { label: "Docentes", href: "/admin/docentes", icon: <IconGraduationCap /> },
            { label: "Empleados", href: "/admin/empleados", icon: <IconBriefcase /> },
          ],
        },
        {
          label: "Operación",
          items: [
            { label: "Cuotas y Caja", href: "/admin/cuotas", icon: <IconWallet /> },
            { label: "Asistencias", href: "/admin/asistencia", icon: <IconCalendarCheck /> },
            { label: "Boletines", href: "/admin/boletines", icon: <IconFileText /> },
            { label: "Vacaciones", href: "/admin/vacaciones", icon: <IconCalendarDays /> },
          ],
        },
      ];
    case "TEACHER":
      return [
        {
          items: [
            { label: "Mis Cursos", href: "/docente", icon: <IconBookOpen /> },
            { label: "Asistencia", href: "/docente/asistencia", icon: <IconCalendarCheck /> },
            { label: "Boletines", href: "/docente/notas", icon: <IconFileText /> },
          ],
        },
      ];
    case "GUARDIAN":
      return [
        {
          items: [
            { label: "Estado de Cuenta", href: "/portal", icon: <IconWallet /> },
            { label: "Académico", href: "/portal/academico", icon: <IconFileText /> },
          ],
        },
      ];
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getQuickActionsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "ADMIN":
    case "STAFF":
      return [
        { label: "Buscar alumnos", href: "/admin/alumnos", icon: <IconSearch /> },
        { label: "Alumnos", href: "/admin/alumnos", icon: <IconUsers className="size-4" /> },
        { label: "Cuotas y Caja", href: "/admin/cuotas", icon: <IconReceipt /> },
        { label: "Asistencia", href: "/admin/asistencia", icon: <IconClipboardCheck /> },
      ];
    case "TEACHER":
      return [
        { label: "Asistencia", href: "/docente/asistencia", icon: <IconClipboardCheck /> },
        { label: "Boletines", href: "/docente/notas", icon: <IconFileText /> },
      ];
    case "GUARDIAN":
      return [
        { label: "Estado de Cuenta", href: "/portal", icon: <IconReceipt /> },
        { label: "Académico", href: "/portal/academico", icon: <IconClipboardCheck /> },
      ];
  }
}

function getRoleMeta(role: UserRole): { badge: string; areaTitle: string } {
  switch (role) {
    case "ADMIN":
      return { badge: "Dirección", areaTitle: "Administración Escolar" };
    case "STAFF":
      return { badge: "Administración", areaTitle: "Administración Escolar" };
    case "TEACHER":
      return { badge: "Docente", areaTitle: "Portal Docente" };
    case "GUARDIAN":
      return { badge: "Familia", areaTitle: "Portal de Familias" };
  }
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotificationSummaryItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  const loadLocalNotifState = () => {
    try {
      const raw = localStorage.getItem("cocoon_notif_state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        readIds?: unknown;
        clearedIds?: unknown;
      };
      setReadIds(
        Array.isArray(parsed.readIds)
          ? parsed.readIds.filter((x): x is string => typeof x === "string")
          : [],
      );
      setClearedIds(
        Array.isArray(parsed.clearedIds)
          ? parsed.clearedIds.filter((x): x is string => typeof x === "string")
          : [],
      );
    } catch {
      // ignore invalid storage
    }
  };

  const persistLocalNotifState = (
    nextReadIds: string[],
    nextClearedIds: string[],
  ) => {
    setReadIds(nextReadIds);
    setClearedIds(nextClearedIds);
    try {
      localStorage.setItem(
        "cocoon_notif_state",
        JSON.stringify({ readIds: nextReadIds, clearedIds: nextClearedIds }),
      );
      window.dispatchEvent(new Event("cocoon-notif-updated"));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    loadLocalNotifState();
    const handleSync = () => loadLocalNotifState();
    window.addEventListener("storage", handleSync);
    window.addEventListener("cocoon-notif-updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("cocoon-notif-updated", handleSync);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?summary=true&limit=50&offset=0")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: NotificationSummaryItem[] } | null) => {
        if (!cancelled && data) {
          setNotifItems(Array.isArray(data.items) ? data.items : []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bellOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  };

  const isConfigArea =
    (user.role === "ADMIN" || user.role === "STAFF") &&
    pathname.startsWith("/admin/configuracion");
  const navGroups = isConfigArea
    ? [getConfigNavGroup()]
    : getNavGroupsForRole(user.role);
  const firstHref = getNavGroupsForRole(user.role)[0]?.items[0]?.href ?? "/";
  const quickActions = getQuickActionsForRole(user.role);
  const roleMeta = getRoleMeta(user.role);
  const breadcrumbs = getBreadcrumbs(pathname);
  const bellHref =
    user.role === "GUARDIAN"
      ? "/portal"
      : user.role === "TEACHER"
        ? "/docente/asistencia"
        : "/admin/notificaciones";

  const visibleNotifItems = notifItems.filter(
    (item) => !clearedIds.includes(item.id),
  );
  const unreadCount = visibleNotifItems.filter(
    (item) => !readIds.includes(item.id),
  ).length;

  const markItemRead = (id: string) => {
    if (readIds.includes(id)) return;
    persistLocalNotifState([...readIds, id], clearedIds);
  };

  const toggleItemRead = (id: string) => {
    if (readIds.includes(id)) {
      persistLocalNotifState(
        readIds.filter((x) => x !== id),
        clearedIds,
      );
    } else {
      persistLocalNotifState([...readIds, id], clearedIds);
    }
  };

  const markAllRead = () => {
    const merged = Array.from(
      new Set([...readIds, ...visibleNotifItems.map((i) => i.id)]),
    );
    persistLocalNotifState(merged, clearedIds);
  };

  const clearAllVisible = () => {
    const mergedCleared = Array.from(
      new Set([...clearedIds, ...visibleNotifItems.map((i) => i.id)]),
    );
    persistLocalNotifState(readIds, mergedCleared);
  };

  const isActive = (href: string) => {
    if (
      href === "/admin" ||
      href === "/docente" ||
      href === "/portal" ||
      href === "/admin/configuracion"
    ) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-gray-900">
      <div>
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <Link href={firstHref} className="flex items-center">
            <img
              src="/images/logo-cocoon.png"
              alt="Escuela Montessori Cocoon"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Cerrar menú"
          >
            <IconClose />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-3 py-5">
          {isConfigArea ? (
            <div className="mb-2 border-b border-gray-100 pb-2">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <IconArrowLeft />
                <span>Volver al panel</span>
              </Link>
            </div>
          ) : (
            <p className="mb-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Menú principal
            </p>
          )}
          <nav className="space-y-1">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label ?? `group-${groupIndex}`}>
                {groupIndex > 0 ? (
                  <div className="my-2 border-t border-gray-100" />
                ) : null}
                {group.label ? (
                  <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border border-gray-200 bg-gray-100 text-gray-900"
                            : "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <span
                          className={cn(
                            active ? "text-brand-600" : "text-gray-400",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Sidebar footer */}
      {user.role === "ADMIN" || user.role === "STAFF" ? (
        <div className="border-t border-gray-200 p-3">
          <Link
            href="/admin/configuracion"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive("/admin/configuracion")
                ? "border border-gray-200 bg-gray-100 text-gray-900"
                : "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            <span
              className={cn(
                isActive("/admin/configuracion") ? "text-brand-600" : "text-gray-400",
              )}
            >
              <IconSettings />
            </span>
            <span>Configuración</span>
          </Link>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 lg:block dark:border-gray-800">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-gray-200 bg-white">
          <div className="flex h-full w-full items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden"
                aria-label="Abrir menú"
              >
                <IconMenu />
              </button>

              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                      {index > 0 ? <IconChevronRight /> : null}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="truncate text-gray-500 transition-colors hover:text-gray-900"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "truncate",
                            isLast
                              ? "font-semibold text-gray-900"
                              : "text-gray-500",
                          )}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden items-center gap-0.5 sm:flex">
                {quickActions.map((action) => (
                  <Link
                    key={`${action.label}-${action.href}`}
                    href={action.href}
                    title={action.label}
                    aria-label={action.label}
                    className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                  >
                    {action.icon}
                  </Link>
                ))}
              </div>

              <div ref={bellRef} className="relative">
                <button
                  type="button"
                  onClick={() => setBellOpen((prev) => !prev)}
                  title="Notificaciones y vencimientos"
                  aria-label="Notificaciones y vencimientos"
                  aria-expanded={bellOpen}
                  className="relative rounded-lg p-2 text-blue-600 transition-colors hover:bg-gray-100"
                >
                  <IconBell />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                {bellOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">
                          Notificaciones
                        </span>
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            {unreadCount}
                          </span>
                        ) : null}
                      </div>

                      {visibleNotifItems.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={markAllRead}
                            disabled={unreadCount === 0}
                            className="text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:text-gray-300"
                          >
                            Marcar leídas
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            type="button"
                            onClick={clearAllVisible}
                            className="text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-800"
                          >
                            Limpiar
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                      {visibleNotifItems.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-gray-500">
                          Sin notificaciones pendientes
                        </div>
                      ) : (
                        visibleNotifItems.map((item) => {
                          const isRead = readIds.includes(item.id);
                          const dotClass =
                            item.category === "OVERDUE"
                              ? "bg-red-500"
                              : item.category === "LEAVE"
                                ? "bg-amber-500"
                                : "bg-blue-500";
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-start justify-between gap-2 px-3.5 py-2.5 transition-colors hover:bg-gray-50",
                                isRead && "opacity-60",
                              )}
                            >
                              <Link
                                href={item.href}
                                onClick={() => {
                                  markItemRead(item.id);
                                  setBellOpen(false);
                                }}
                                className="flex min-w-0 flex-1 items-start gap-2.5"
                              >
                                <span
                                  className={cn(
                                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                    dotClass,
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-gray-900">
                                    {item.title}
                                  </p>
                                  <p className="truncate text-[11px] text-gray-500">
                                    {item.subtitle}
                                  </p>
                                </div>
                              </Link>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleItemRead(item.id);
                                }}
                                title={
                                  isRead
                                    ? "Marcar como no leída"
                                    : "Marcar como leída"
                                }
                                aria-label={
                                  isRead
                                    ? "Marcar como no leída"
                                    : "Marcar como leída"
                                }
                                className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-full border",
                                    isRead
                                      ? "border-gray-300 bg-transparent"
                                      : "border-blue-600 bg-blue-600",
                                  )}
                                />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-2">
                      <Link
                        href={bellHref}
                        onClick={() => setBellOpen(false)}
                        className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver todas las notificaciones
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-700"
                title={`${user.name} (${roleMeta.badge})`}
              >
                {getInitials(user.name)}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-60"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <IconLogout />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full flex-1 px-4 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
