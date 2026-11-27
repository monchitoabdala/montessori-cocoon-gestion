import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { toNumber } from "@/lib/billing";
import { generatePaymentReceiptPdf } from "@/lib/pdf-receipt";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role) && !isGuardian(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const { id } = await context.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      guardian: true,
      allocations: {
        include: {
          feeCharge: {
            include: {
              student: {
                include: {
                  division: {
                    include: {
                      grade: true,
                    },
                  },
                  guardians: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (isGuardian(session.role)) {
    const ownsDirect =
      Boolean(session.guardianId) && payment.guardianId === session.guardianId;
    const ownsAllocatedStudent = payment.allocations.some((alloc) =>
      alloc.feeCharge.student.guardians.some(
        (g) => g.guardianId === session.guardianId
      )
    );

    if (!ownsDirect && !ownsAllocatedStudent) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
  }

  const pdfBytes = generatePaymentReceiptPdf({
    receiptNumber: payment.receiptNumber,
    paidAt: payment.paidAt,
    method: payment.method,
    amount: toNumber(payment.amount),
    notes: payment.notes,
    guardianName: payment.guardian
      ? `${payment.guardian.firstName} ${payment.guardian.lastName}`
      : null,
    guardianDni: payment.guardian?.dni ?? null,
    guardianEmail: payment.guardian?.email ?? null,
    items: payment.allocations.map((alloc) => {
      const student = alloc.feeCharge.student;
      const divisionLabel = student.division
        ? `${student.division.grade.name} ${student.division.name}`
        : "";
      return {
        studentName: `${student.lastName}, ${student.firstName}`,
        legajo: student.legajo,
        divisionLabel,
        description: alloc.feeCharge.description,
        period: alloc.feeCharge.period,
        baseAmount: toNumber(alloc.feeCharge.baseAmount),
        discountAmount: toNumber(alloc.feeCharge.discountAmount),
        lateFeeAmount: toNumber(alloc.feeCharge.lateFeeAmount),
        finalAmount: toNumber(alloc.feeCharge.finalAmount),
        allocatedAmount: toNumber(alloc.amount),
      };
    }),
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payment.receiptNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
