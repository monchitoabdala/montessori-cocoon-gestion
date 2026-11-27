import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  dni: z.string().trim().min(6, "DNI inválido"),
  email: z.string().trim().email("Email inválido").optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  roleTitle: z.string().trim().min(1, "El cargo es requerido"),
  department: z.string().trim().min(1, "El departamento es requerido"),
  hireDate: z.string().optional().nullable(),
});

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
    const search = params.get("search")?.trim();
    const department = params.get("department")?.trim();

    const andConditions: Prisma.EmployeeWhereInput[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { dni: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { roleTitle: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (department) {
      andConditions.push({
        department: { equals: department, mode: "insensitive" },
      });
    }

    const employees = await prisma.employee.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        user: {
          select: { id: true, email: true, role: true, active: true },
        },
        teacher: {
          select: {
            id: true,
            specialty: true,
            divisions: {
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
          },
        },
      },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json(
      { error: "Error al listar empleados" },
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
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existingDni = await prisma.employee.findUnique({
      where: { dni: data.dni },
    });
    if (existingDni) {
      return NextResponse.json(
        { error: "Ya existe un empleado con ese DNI" },
        { status: 409 }
      );
    }

    let hireDate: Date | null = null;
    if (data.hireDate) {
      const parsedDate = new Date(data.hireDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Fecha de ingreso inválida" },
          { status: 400 }
        );
      }
      hireDate = parsedDate;
    }

    const employee = await prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        email: data.email ? data.email.toLowerCase() : null,
        phone: data.phone || null,
        photoUrl: data.photoUrl || null,
        roleTitle: data.roleTitle,
        department: data.department,
        hireDate,
      },
      include: {
        user: { select: { id: true, email: true, role: true, active: true } },
        teacher: {
          select: {
            id: true,
            specialty: true,
            divisions: {
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
          },
        },
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json(
      { error: "Error al crear el empleado" },
      { status: 500 }
    );
  }
}
