import { FeeStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { generateReceiptNumber, roundCurrency, toNumber } from "@/lib/billing";
import prisma from "@/lib/prisma";

const createPaymentSchema = z.object({
  feeChargeId: z.string().min(1, "feeChargeId es requerido"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["CASH", "TRANSFER", "CARD"]),
  notes: z.string().max(500).optional(),
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
  const guardianId = searchParams.get("guardianId");
  const methodParam = searchParams.get("method");
  const limitParam = Number(searchParams.get("limit") ?? 50);
  const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

  const where: Prisma.PaymentWhereInput = {};

  if (
    methodParam &&
    Object.values(PaymentMethod).includes(methodParam as PaymentMethod)
  ) {
    where.method = methodParam as PaymentMethod;
  }

  if (isGuardian(session.role)) {
    if (!session.guardianId) {
      return NextResponse.json({ payments: [] });
    }
    where.OR = [
      { guardianId: session.guardianId },
      {
        allocations: {
          some: {
            feeCharge: {
              student: {
                guardians: {
                  some: { guardianId: session.guardianId },
                },
              },
            },
          },
        },
      },
    ];
  } else if (guardianId) {
    where.guardianId = guardianId;
  }

  const payments = await prisma.payment.findMany({
    where,
    take,
    orderBy: { paidAt: "desc" },
    include: {
      guardian: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          photoUrl: true,
        },
      },
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
      allocations: {
        include: {
          feeCharge: {
            select: {
              id: true,
              period: true,
              description: true,
              finalAmount: true,
              status: true,
              student: {
                select: {
                  id: true,
                  legajo: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ payments });
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
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { feeChargeId, method, notes } = parsed.data;
  const amount = roundCurrency(parsed.data.amount);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const feeCharge = await tx.feeCharge.findUnique({
        where: { id: feeChargeId },
        include: {
          student: {
            include: {
              guardians: true,
            },
          },
        },
      });

      if (!feeCharge) {
        throw new Error("NOT_FOUND:Cuota no encontrada");
      }

      if (feeCharge.status === FeeStatus.CANCELLED) {
        throw new Error("BAD_REQUEST:No se puede cobrar una cuota cancelada");
      }

      if (feeCharge.status === FeeStatus.PAID) {
        throw new Error("BAD_REQUEST:La cuota ya se encuentra pagada en su totalidad");
      }

      const finalAmount = toNumber(feeCharge.finalAmount);
      const paidAmount = toNumber(feeCharge.paidAmount);
      const remaining = roundCurrency(Math.max(0, finalAmount - paidAmount));

      if (amount > remaining + 0.01) {
        throw new Error(
          `BAD_REQUEST:El monto (${amount}) supera el saldo pendiente (${remaining})`
        );
      }

      const primaryGuardian =
        feeCharge.student.guardians.find((g) => g.isFinancialResponsible) ??
        feeCharge.student.guardians[0];

      const payment = await tx.payment.create({
        data: {
          guardianId: primaryGuardian?.guardianId ?? null,
          amount,
          method: method as PaymentMethod,
          status: PaymentStatus.COMPLETED,
          receiptNumber: generateReceiptNumber(),
          paidAt: new Date(),
          notes: notes?.trim() || null,
          recordedByUserId: session.userId,
        },
      });

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          feeChargeId: feeCharge.id,
          amount,
        },
      });

      const newPaidAmount = roundCurrency(paidAmount + amount);
      const newStatus =
        newPaidAmount >= finalAmount - 0.01
          ? FeeStatus.PAID
          : FeeStatus.PARTIAL;

      const updatedFeeCharge = await tx.feeCharge.update({
        where: { id: feeCharge.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return { payment, feeCharge: updatedFeeCharge };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al registrar pago";
    if (msg.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: msg.slice(10) }, { status: 404 });
    }
    if (msg.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: msg.slice(12) }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
