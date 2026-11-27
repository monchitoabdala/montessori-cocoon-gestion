import { FeeStatus, PaymentStatus, StudentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { roundCurrency, toNumber } from "@/lib/billing";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const period = searchParams.get("period") || defaultPeriod;

  const [yearStr, monthStr] = period.split("-");
  const targetYear = Number(yearStr) || now.getFullYear();
  const targetMonth = (Number(monthStr) || now.getMonth() + 1) - 1;
  const monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
  const monthEnd = new Date(targetYear, targetMonth + 1, 1, 0, 0, 0, 0);

  const [
    monthCharges,
    monthPayments,
    overdueAll,
    activeStudentsCount,
    overdueCharges,
    recentPayments,
  ] = await Promise.all([
    prisma.feeCharge.findMany({
      where: {
        period,
        status: { not: FeeStatus.CANCELLED },
      },
      select: { finalAmount: true, paidAmount: true },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: monthStart, lt: monthEnd },
      },
      select: { amount: true },
    }),
    prisma.feeCharge.findMany({
      where: {
        status: FeeStatus.OVERDUE,
      },
      select: { finalAmount: true, paidAmount: true },
    }),
    prisma.student.count({
      where: { status: StudentStatus.ACTIVE },
    }),
    prisma.feeCharge.findMany({
      where: { status: FeeStatus.OVERDUE },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: {
        student: {
          select: {
            id: true,
            legajo: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            division: {
              select: {
                name: true,
                grade: { select: { name: true } },
              },
            },
            guardians: {
              include: {
                guardian: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    whatsapp: true,
                    phone: true,
                    photoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: {
        guardian: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
        allocations: {
          include: {
            feeCharge: {
              select: {
                id: true,
                period: true,
                description: true,
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    legajo: true,
                    photoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const totalBilledThisMonth = roundCurrency(
    monthCharges.reduce((acc, c) => acc + toNumber(c.finalAmount), 0)
  );
  const billedPaidThisMonth = roundCurrency(
    monthCharges.reduce((acc, c) => acc + toNumber(c.paidAmount), 0)
  );
  const totalCollectedThisMonth = roundCurrency(
    monthPayments.reduce((acc, p) => acc + toNumber(p.amount), 0)
  );
  const totalOverdue = roundCurrency(
    overdueAll.reduce(
      (acc, c) =>
        acc + Math.max(0, toNumber(c.finalAmount) - toNumber(c.paidAmount)),
      0
    )
  );
  const collectionRate =
    totalBilledThisMonth > 0
      ? roundCurrency((billedPaidThisMonth / totalBilledThisMonth) * 100)
      : 0;

  return NextResponse.json({
    period,
    totalBilledThisMonth,
    totalCollectedThisMonth,
    totalOverdue,
    collectionRate,
    activeStudentsCount,
    overdueCharges,
    recentPayments,
  });
}
