import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, hashPassword, isAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTeacherSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  dni: z.string().trim().min(6, "DNI inválido"),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().trim().optional().nullable(),
  specialty: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  divisionIds: z.array(z.string().min(1)).optional(),
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

    const search = req.nextUrl.searchParams.get("search")?.trim();
    const where: Prisma.TeacherWhereInput | undefined = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { dni: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { specialty: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined;

    const teachers = await prisma.teacher.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            email: true,
            phone: true,
            photoUrl: true,
            roleTitle: true,
            department: true,
            active: true,
          },
        },
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
        subjects: {
          orderBy: { name: "asc" },
          include: {
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
          },
        },
      },
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error("GET /api/teachers error:", error);
    return NextResponse.json(
      { error: "Error al listar docentes" },
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
    const parsed = createTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const emailNormalized = data.email.toLowerCase();

    const [existingUser, existingTeacherDni, existingEmployeeDni] =
      await Promise.all([
        prisma.user.findUnique({ where: { email: emailNormalized } }),
        prisma.teacher.findUnique({ where: { dni: data.dni } }),
        prisma.employee.findUnique({ where: { dni: data.dni } }),
      ]);

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }
    if (existingTeacherDni || existingEmployeeDni) {
      return NextResponse.json(
        { error: "Ya existe un docente o empleado con ese DNI" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password ?? data.dni);

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailNormalized,
          passwordHash,
          name: `${data.firstName} ${data.lastName}`,
          role: "TEACHER",
        },
      });

      const createdTeacher = await tx.teacher.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni,
          email: emailNormalized,
          phone: data.phone || null,
          specialty: data.specialty || null,
        },
      });

      await tx.employee.create({
        data: {
          userId: user.id,
          teacherId: createdTeacher.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni,
          email: emailNormalized,
          phone: data.phone || null,
          photoUrl: data.photoUrl || null,
          roleTitle: "Docente Titular",
          department: "Docencia",
        },
      });

      if (data.divisionIds && data.divisionIds.length > 0) {
        await tx.division.updateMany({
          where: { id: { in: data.divisionIds } },
          data: { teacherId: createdTeacher.id },
        });
      }

      return tx.teacher.findUniqueOrThrow({
        where: { id: createdTeacher.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dni: true,
              email: true,
              phone: true,
              photoUrl: true,
              roleTitle: true,
              department: true,
            },
          },
          divisions: {
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
          subjects: {
            include: {
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
            },
          },
        },
      });
    });

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teachers error:", error);
    return NextResponse.json(
      { error: "Error al crear el docente" },
      { status: 500 }
    );
  }
}
