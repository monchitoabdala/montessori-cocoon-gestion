import { FeeStatus, FeeType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { roundCurrency } from "@/lib/billing";
import prisma from "@/lib/prisma";

const createFeeSchema = z.object({
  studentId: z.string().min(1, "studentId es requerido"),
  type: z.nativeEnum(FeeType).optional().default(FeeType.MONTHLY_FEE),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "El periodo debe tener formato YYYY-MM"),
  description: z.string().min(2, "La descripcion es requerida").max(200),
  baseAmount: z.coerce.number().positive("El monto base debe ser mayor a 0"),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  academicYearId: z.string().optional(),
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
  const statusParam = searchParams.get("status");
  const period = searchParams.get("period");
  const studentId = searchParams.get("studentId");
  const guardianId = searchParams.get("guardianId");
  const divisionId = searchParams.get("divisionId");

  const where: Prisma.FeeChargeWhereInput = {};

  if (statusParam && Object.values(FeeStatus).includes(statusParam as FeeStatus)) {
    where.status = statusParam as FeeStatus;
  }
  if (period) {
    where.period = period;
  }
  if (studentId) {
    where.studentId = studentId;
  }

  const studentFilter: Prisma.StudentWhereInput = {};
  if (divisionId) {
    studentFilter.divisionId = divisionId;
  }

  if (isGuardian(session.role)) {
    if (!session.guardianId) {
      return NextResponse.json({ fees: [] });
    }
    studentFilter.guardians = {
      some: { guardianId: session.guardianId },
    };
  } else if (guardianId) {
    studentFilter.guardians = {
      some: { guardianId },
    };
  }

  if (Object.keys(studentFilter).length > 0) {
    where.student = studentFilter;
  }

  const fees = await prisma.feeCharge.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      student: {
        select: {
          id: true,
          legajo: true,
          firstName: true,
          lastName: true,
          dni: true,
          status: true,
          photoUrl: true,
          division: {
            select: {
              id: true,
              name: true,
              grade: {
                select: {
                  id: true,
                  name: true,
                  level: { select: { id: true, name: true } },
                },
              },
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
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              receiptNumber: true,
              method: true,
              paidAt: true,
              amount: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ fees });
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
  const parsed = createFeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const dueDate = new Date(data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json(
      { error: "Fecha de vencimiento invalida" },
      { status: 400 }
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json(
      { error: "Alumno no encontrado" },
      { status: 404 }
    );
  }

  let academicYearId = data.academicYearId;
  if (!academicYearId) {
    const activeYear =
      (await prisma.academicYear.findFirst({
        where: { isActive: true },
        orderBy: { year: "desc" },
      })) ??
      (await prisma.academicYear.findFirst({
        orderBy: { year: "desc" },
      }));

    if (!activeYear) {
      return NextResponse.json(
        { error: "No hay ciclo lectivo configurado" },
        { status: 400 }
      );
    }
    academicYearId = activeYear.id;
  }

  const baseAmount = roundCurrency(data.baseAmount);
  const discountAmount = roundCurrency(
    Math.min(baseAmount, data.discountAmount)
  );
  const finalAmount = roundCurrency(Math.max(0, baseAmount - discountAmount));

  const fee = await prisma.feeCharge.create({
    data: {
      studentId: data.studentId,
      academicYearId,
      type: data.type,
      period: data.period,
      description: data.description,
      baseAmount,
      discountAmount,
      lateFeeAmount: 0,
      finalAmount,
      paidAmount: 0,
      dueDate,
      status: FeeStatus.PENDING,
    },
  });

  return NextResponse.json({ fee }, { status: 201 });
}
