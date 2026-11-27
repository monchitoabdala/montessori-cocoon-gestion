import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createLeaveSchema = z.object({
  employeeId: z.string().min(1, "El empleado es requerido"),
  type: z.enum(["VACATION", "MEDICAL", "PERSONAL", "STUDY"]),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  daysCount: z.coerce.number().int().positive("La cantidad de días debe ser positiva"),
  notes: z.string().trim().optional().nullable(),
});

const patchLeaveSchema = z.object({
  leaveId: z.string().min(1, "leaveId es requerido"),
  status: z.enum(["APPROVED", "REJECTED"]),
});

async function getUsedVacationDays(
  employeeId: string,
  year: number
): Promise<number> {
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const agg = await prisma.employeeLeave.aggregate({
    where: {
      employeeId,
      type: "VACATION",
      status: { in: ["APPROVED", "PENDING"] },
      startDate: { gte: yearStart, lte: yearEnd },
    },
    _sum: { daysCount: true },
  });

  return agg._sum.daysCount ?? 0;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const monthParam = params.get("month")?.trim();
    const employeeIdParam = params.get("employeeId")?.trim();

    let targetYear = new Date().getFullYear();
    const andConditions: Prisma.EmployeeLeaveWhereInput[] = [];

    if (monthParam) {
      const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
      if (!match) {
        return NextResponse.json(
          { error: "Formato de mes inválido (YYYY-MM)" },
          { status: 400 }
        );
      }
      const year = Number(match[1]);
      const month = Number(match[2]);
      targetYear = year;
      const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      andConditions.push({
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      });
    }

    if (employeeIdParam) {
      andConditions.push({ employeeId: employeeIdParam });
    }

    const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const [leaves, rawEmployees] = await Promise.all([
      prisma.employeeLeave.findMany({
        where: andConditions.length > 0 ? { AND: andConditions } : undefined,
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              roleTitle: true,
              department: true,
              vacationDaysLimit: true,
            },
          },
        },
      }),
      prisma.employee.findMany({
        where: { active: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          roleTitle: true,
          department: true,
          vacationDaysLimit: true,
          leaves: {
            where: {
              type: "VACATION",
              status: { in: ["APPROVED", "PENDING"] },
              startDate: { gte: yearStart, lte: yearEnd },
            },
            select: { daysCount: true },
          },
        },
      }),
    ]);

    const employees = rawEmployees.map((emp) => {
      const usedVacationDays = emp.leaves.reduce(
        (sum, l) => sum + l.daysCount,
        0
      );
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        photoUrl: emp.photoUrl,
        roleTitle: emp.roleTitle,
        department: emp.department,
        vacationDaysLimit: emp.vacationDaysLimit,
        usedVacationDays,
        remainingVacationDays: Math.max(
          0,
          emp.vacationDaysLimit - usedVacationDays
        ),
      };
    });

    return NextResponse.json({ leaves, employees });
  } catch (error) {
    console.error("GET /api/leaves error:", error);
    return NextResponse.json(
      { error: "Error al obtener las licencias y vacaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return NextResponse.json(
        { error: "Rango de fechas inválido" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    if (data.type === "VACATION") {
      const year = startDate.getUTCFullYear();
      const usedVacationDays = await getUsedVacationDays(employee.id, year);
      if (usedVacationDays + data.daysCount > employee.vacationDaysLimit) {
        const remaining = Math.max(
          0,
          employee.vacationDaysLimit - usedVacationDays
        );
        return NextResponse.json(
          {
            error: `Supera el límite anual de vacaciones (${usedVacationDays} usados de ${employee.vacationDaysLimit} días; disponibles: ${remaining}).`,
          },
          { status: 400 }
        );
      }
    }

    const leave = await prisma.employeeLeave.create({
      data: {
        employeeId: employee.id,
        type: data.type,
        startDate,
        endDate,
        daysCount: data.daysCount,
        notes: data.notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            roleTitle: true,
            department: true,
            vacationDaysLimit: true,
          },
        },
      },
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leaves error:", error);
    return NextResponse.json(
      { error: "Error al crear la solicitud de licencia" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.employeeLeave.findUnique({
      where: { id: parsed.data.leaveId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Solicitud de licencia no encontrada" },
        { status: 404 }
      );
    }

    const leave = await prisma.employeeLeave.update({
      where: { id: parsed.data.leaveId },
      data: { status: parsed.data.status },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            roleTitle: true,
            department: true,
            vacationDaysLimit: true,
          },
        },
      },
    });

    return NextResponse.json({ leave });
  } catch (error) {
    console.error("PATCH /api/leaves error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la licencia" },
      { status: 500 }
    );
  }
}
