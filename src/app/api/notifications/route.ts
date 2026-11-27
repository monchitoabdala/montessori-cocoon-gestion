import { FeeStatus, LeaveStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { toNumber } from "@/lib/billing";
import { sendAndLogFeeNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

interface SummaryNotificationItem {
  id: string;
  title: string;
  subtitle: string;
  category: "OVERDUE" | "LEAVE" | "FEE";
  href: string;
  date: string;
}

function formatArsShort(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  SICK: "Licencia medica",
  PERSONAL: "Dia personal",
  MATERNITY: "Maternidad",
  STUDY: "Licencia por estudio",
};

const createNotificationSchema = z.object({
  feeChargeId: z.string().min(1, "feeChargeId es requerido"),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("summary") === "true") {
    const rawLimit = Number(searchParams.get("limit") ?? 20);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 20;
    const rawOffset = Number(searchParams.get("offset") ?? 0);
    const offset =
      Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

    if (isAdminOrStaff(session.role)) {
      const [overdueCharges, pendingLeaves, recentLogs] = await Promise.all([
        prisma.feeCharge.findMany({
          where: { status: FeeStatus.OVERDUE },
          orderBy: { dueDate: "asc" },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.employeeLeave.findMany({
          where: { status: LeaveStatus.PENDING },
          orderBy: { createdAt: "desc" },
          include: {
            employee: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.notificationLog.findMany({
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            student: { select: { firstName: true, lastName: true } },
            guardian: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

      const allItems: SummaryNotificationItem[] = [
        ...pendingLeaves.map((leave) => ({
          id: `leave-${leave.id}`,
          title: `Solicitud de ${LEAVE_TYPE_LABELS[leave.type] ?? leave.type}`,
          subtitle: `${leave.employee.lastName}, ${leave.employee.firstName} · ${leave.daysCount} ${leave.daysCount === 1 ? "dia" : "dias"}`,
          category: "LEAVE" as const,
          href: "/admin/vacaciones",
          date: leave.createdAt.toISOString(),
        })),
        ...overdueCharges.map((charge) => {
          const balance = Math.max(
            0,
            toNumber(charge.finalAmount) - toNumber(charge.paidAmount)
          );
          return {
            id: `overdue-${charge.id}`,
            title: `Cuota vencida · ${charge.student.lastName}, ${charge.student.firstName}`,
            subtitle: `${charge.description} · Saldo ${formatArsShort(balance)}`,
            category: "OVERDUE" as const,
            href: "/admin/cuotas",
            date: charge.dueDate.toISOString(),
          };
        }),
        ...recentLogs.map((log) => {
          const person = log.student
            ? `${log.student.lastName}, ${log.student.firstName}`
            : log.guardian
              ? `${log.guardian.lastName}, ${log.guardian.firstName}`
              : log.recipient;
          return {
            id: `log-${log.id}`,
            title: log.subject || `Aviso ${log.channel}`,
            subtitle: `${person} · ${log.channel} (${log.status})`,
            category: "FEE" as const,
            href: "/admin/cuotas",
            date: log.createdAt.toISOString(),
          };
        }),
      ].sort((a, b) => b.date.localeCompare(a.date));

      const totalCount = allItems.length;
      const unreadCount = overdueCharges.length + pendingLeaves.length;
      const items = allItems.slice(offset, offset + limit);
      const hasMore = offset + items.length < totalCount;

      return NextResponse.json({
        unreadCount,
        totalCount,
        hasMore,
        items,
      });
    }

    if (isGuardian(session.role)) {
      if (!session.guardianId) {
        return NextResponse.json({
          unreadCount: 0,
          totalCount: 0,
          hasMore: false,
          items: [],
        });
      }

      const [charges, totalCount] = await Promise.all([
        prisma.feeCharge.findMany({
          where: {
            status: { in: [FeeStatus.OVERDUE, FeeStatus.PENDING] },
            student: {
              guardians: { some: { guardianId: session.guardianId } },
            },
          },
          skip: offset,
          take: limit,
          orderBy: { dueDate: "asc" },
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.feeCharge.count({
          where: {
            status: { in: [FeeStatus.OVERDUE, FeeStatus.PENDING] },
            student: {
              guardians: { some: { guardianId: session.guardianId } },
            },
          },
        }),
      ]);

      const items: SummaryNotificationItem[] = charges.map((charge) => {
        const balance = Math.max(
          0,
          toNumber(charge.finalAmount) - toNumber(charge.paidAmount)
        );
        const isOverdue = charge.status === FeeStatus.OVERDUE;
        return {
          id: `fee-${charge.id}`,
          title: `${isOverdue ? "Cuota vencida" : "Cuota pendiente"} · ${charge.student.firstName}`,
          subtitle: `${charge.description} · ${formatArsShort(balance)}`,
          category: isOverdue ? "OVERDUE" : "FEE",
          href: "/portal",
          date: charge.dueDate.toISOString(),
        };
      });

      const hasMore = offset + items.length < totalCount;

      return NextResponse.json({
        unreadCount: totalCount,
        totalCount,
        hasMore,
        items,
      });
    }

    return NextResponse.json({
      unreadCount: 0,
      totalCount: 0,
      hasMore: false,
      items: [],
    });
  }

  if (!isAdminOrStaff(session.role) && !isGuardian(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const limitParam = Number(searchParams.get("limit") ?? 50);
  const take =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 200)
      : 50;

  const where: Prisma.NotificationLogWhereInput = {};
  if (isGuardian(session.role)) {
    if (!session.guardianId) {
      return NextResponse.json({ logs: [] });
    }
    where.guardianId = session.guardianId;
  }

  const logs = await prisma.notificationLog.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      guardian: {
        select: { id: true, firstName: true, lastName: true },
      },
      student: {
        select: { id: true, firstName: true, lastName: true, legajo: true },
      },
      feeCharge: {
        select: { id: true, period: true, description: true },
      },
    },
  });

  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await sendAndLogFeeNotification(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al enviar notificacion";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
