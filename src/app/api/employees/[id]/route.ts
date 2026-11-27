import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateEmployeeSchema = z.object({
  roleTitle: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Email inválido").optional().nullable(),
  cuil: z.string().trim().optional().nullable(),
  baseSalary: z.coerce.number().nonnegative().optional().nullable(),
  active: z.boolean().optional(),
});

const postEmployeeActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CREATE_LEAVE"),
    type: z.enum(["VACATION", "MEDICAL", "PERSONAL", "STUDY"]),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    daysCount: z.coerce.number().int().positive(),
    notes: z.string().trim().optional().nullable(),
  }),
  z.object({
    action: z.literal("UPDATE_LEAVE"),
    leaveId: z.string().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
  }),
  z.object({
    action: z.literal("CREATE_PAYROLL"),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
    grossAmount: z.coerce.number().positive(),
    deductions: z.coerce.number().nonnegative().optional().default(0),
    notes: z.string().trim().optional().nullable(),
  }),
  z.object({
    action: z.literal("MARK_PAYROLL_PAID"),
    payrollId: z.string().min(1),
  }),
]);

const employeeDetailInclude = {
  user: {
    select: { id: true, email: true, role: true, active: true },
  },
  teacher: {
    select: {
      id: true,
      specialty: true,
      divisions: {
        orderBy: [
          { grade: { level: { order: "asc" } } },
          { grade: { order: "asc" } },
          { name: "asc" },
        ],
        include: {
          grade: {
            select: {
              id: true,
              name: true,
              level: { select: { id: true, name: true } },
            },
          },
          _count: { select: { students: true } },
        },
      },
    },
  },
  leaves: {
    orderBy: { startDate: "desc" },
  },
  payrollRecords: {
    orderBy: { period: "desc" },
  },
} satisfies Prisma.EmployeeInclude;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await context.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeDetailInclude,
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const usedVacationDays = employee.leaves
      .filter(
        (l) =>
          l.type === "VACATION" &&
          (l.status === "APPROVED" || l.status === "PENDING")
      )
      .reduce((sum, l) => sum + l.daysCount, 0);

    return NextResponse.json({
      employee: {
        ...employee,
        usedVacationDays,
        remainingVacationDays: Math.max(
          0,
          employee.vacationDaysLimit - usedVacationDays
        ),
      },
    });
  } catch (error) {
    console.error("GET /api/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener el legajo del empleado" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        roleTitle: data.roleTitle,
        department: data.department,
        phone: data.phone === "" ? null : data.phone,
        email:
          data.email === ""
            ? null
            : data.email !== undefined && data.email !== null
              ? data.email.toLowerCase()
              : undefined,
        cuil: data.cuil === "" ? null : data.cuil,
        baseSalary: data.baseSalary,
        active: data.active,
      },
      include: employeeDetailInclude,
    });

    const usedVacationDays = employee.leaves
      .filter(
        (l) =>
          l.type === "VACATION" &&
          (l.status === "APPROVED" || l.status === "PENDING")
      )
      .reduce((sum, l) => sum + l.daysCount, 0);

    return NextResponse.json({
      employee: {
        ...employee,
        usedVacationDays,
        remainingVacationDays: Math.max(
          0,
          employee.vacationDaysLimit - usedVacationDays
        ),
      },
    });
  } catch (error) {
    console.error("PATCH /api/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el empleado" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = postEmployeeActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "CREATE_LEAVE") {
      const startDate = new Date(payload.startDate);
      const endDate = new Date(payload.endDate);
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

      if (payload.type === "VACATION") {
        const year = startDate.getUTCFullYear();
        const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        const agg = await prisma.employeeLeave.aggregate({
          where: {
            employeeId: id,
            type: "VACATION",
            status: { in: ["APPROVED", "PENDING"] },
            startDate: { gte: yearStart, lte: yearEnd },
          },
          _sum: { daysCount: true },
        });
        const usedVacationDays = agg._sum.daysCount ?? 0;
        if (usedVacationDays + payload.daysCount > existing.vacationDaysLimit) {
          const remaining = Math.max(
            0,
            existing.vacationDaysLimit - usedVacationDays
          );
          return NextResponse.json(
            {
              error: `Supera el límite anual de vacaciones (${usedVacationDays} usados de ${existing.vacationDaysLimit} días; disponibles: ${remaining}).`,
            },
            { status: 400 }
          );
        }
      }

      const leave = await prisma.employeeLeave.create({
        data: {
          employeeId: id,
          type: payload.type,
          startDate,
          endDate,
          daysCount: payload.daysCount,
          notes: payload.notes || null,
        },
      });
      return NextResponse.json({ leave }, { status: 201 });
    }

    if (payload.action === "UPDATE_LEAVE") {
      const leaveExisting = await prisma.employeeLeave.findFirst({
        where: { id: payload.leaveId, employeeId: id },
      });
      if (!leaveExisting) {
        return NextResponse.json(
          { error: "Solicitud de licencia no encontrada" },
          { status: 404 }
        );
      }

      const leave = await prisma.employeeLeave.update({
        where: { id: payload.leaveId },
        data: { status: payload.status },
      });
      return NextResponse.json({ leave });
    }

    if (payload.action === "CREATE_PAYROLL") {
      const duplicate = await prisma.payrollRecord.findUnique({
        where: {
          employeeId_period: {
            employeeId: id,
            period: payload.period,
          },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe una liquidación para ese período" },
          { status: 409 }
        );
      }

      const deductions = payload.deductions ?? 0;
      const netAmount = Math.max(0, payload.grossAmount - deductions);

      const payroll = await prisma.payrollRecord.create({
        data: {
          employeeId: id,
          period: payload.period,
          grossAmount: payload.grossAmount,
          deductions,
          netAmount,
          notes: payload.notes || null,
        },
      });
      return NextResponse.json({ payroll }, { status: 201 });
    }

    if (payload.action === "MARK_PAYROLL_PAID") {
      const payrollExisting = await prisma.payrollRecord.findFirst({
        where: { id: payload.payrollId, employeeId: id },
      });
      if (!payrollExisting) {
        return NextResponse.json(
          { error: "Liquidación no encontrada" },
          { status: 404 }
        );
      }

      const payroll = await prisma.payrollRecord.update({
        where: { id: payload.payrollId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
      return NextResponse.json({ payroll });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/employees/[id] error:", error);
    return NextResponse.json(
      { error: "Error al procesar la acción del empleado" },
      { status: 500 }
    );
  }
}
