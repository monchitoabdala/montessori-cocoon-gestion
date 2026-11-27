import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { sendAndLogFeeNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

const createNotificationSchema = z.object({
  feeChargeId: z.string().min(1, "feeChargeId es requerido"),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role) && !isGuardian(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
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
