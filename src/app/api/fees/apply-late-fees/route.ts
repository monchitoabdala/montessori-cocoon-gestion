import { FeeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { calculateLateFee, roundCurrency, toNumber } from "@/lib/billing";
import prisma from "@/lib/prisma";

const applyLateFeesSchema = z.object({
  surchargePercent: z.coerce.number().min(0).max(100).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = applyLateFeesSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const activeYear =
    (await prisma.academicYear.findFirst({
      where: { isActive: true },
      orderBy: { year: "desc" },
    })) ??
    (await prisma.academicYear.findFirst({
      orderBy: { year: "desc" },
    }));

  const defaultSurcharge = activeYear ? toNumber(activeYear.lateFeePct) : 10;
  const surchargePercent = parsed.data.surchargePercent ?? defaultSurcharge;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const pastDueCharges = await prisma.feeCharge.findMany({
    where: {
      status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
      dueDate: { lt: startOfToday },
    },
  });

  const updatedIds: string[] = [];

  for (const charge of pastDueCharges) {
    const existingLateFee = toNumber(charge.lateFeeAmount);
    const baseAmount = toNumber(charge.baseAmount);
    const discountAmount = toNumber(charge.discountAmount);

    const lateFeeAmount =
      existingLateFee > 0
        ? existingLateFee
        : calculateLateFee({
            baseAmount,
            discountAmount,
            surchargePercent,
          });

    const finalAmount = roundCurrency(
      Math.max(0, baseAmount - discountAmount + lateFeeAmount)
    );

    await prisma.feeCharge.update({
      where: { id: charge.id },
      data: {
        lateFeeAmount,
        finalAmount,
        status: FeeStatus.OVERDUE,
      },
    });

    updatedIds.push(charge.id);
  }

  return NextResponse.json({
    updatedCount: updatedIds.length,
    surchargePercent,
    updatedIds,
  });
}
