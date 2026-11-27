import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff, isTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateTeacherSchema = z.object({
  specialty: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  divisionIds: z.array(z.string().min(1)).optional(),
});

const teacherDetailInclude = {
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
      students: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          legajo: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          status: true,
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
} satisfies Prisma.TeacherInclude;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const canAccess =
      isAdminOrStaff(session.role) ||
      (isTeacher(session.role) && session.teacherId === id);

    if (!canAccess) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: teacherDetailInclude,
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Docente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error("GET /api/teachers/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener el docente" },
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
    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.teacher.findUnique({
      where: { id },
      include: { employee: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Docente no encontrado" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    const teacher = await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: {
          specialty: data.specialty === "" ? null : data.specialty,
          phone: data.phone === "" ? null : data.phone,
        },
      });

      if (
        existing.employee &&
        (data.phone !== undefined || data.photoUrl !== undefined)
      ) {
        await tx.employee.update({
          where: { id: existing.employee.id },
          data: {
            phone: data.phone === "" ? null : data.phone,
            photoUrl: data.photoUrl === "" ? null : data.photoUrl,
          },
        });
      }

      if (data.divisionIds !== undefined) {
        await tx.division.updateMany({
          where: {
            teacherId: id,
            id: { notIn: data.divisionIds },
          },
          data: { teacherId: null },
        });

        if (data.divisionIds.length > 0) {
          await tx.division.updateMany({
            where: { id: { in: data.divisionIds } },
            data: { teacherId: id },
          });
        }
      }

      return tx.teacher.findUniqueOrThrow({
        where: { id },
        include: teacherDetailInclude,
      });
    });

    return NextResponse.json({ teacher });
  } catch (error) {
    console.error("PATCH /api/teachers/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el docente" },
      { status: 500 }
    );
  }
}
