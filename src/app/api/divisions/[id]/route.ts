import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff, isTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateDivisionSchema = z.object({
  teacherId: z.string().min(1).optional().nullable(),
  capacity: z.coerce.number().int().positive("El cupo debe ser positivo").optional(),
});

const divisionDetailInclude = {
  grade: {
    include: {
      level: true,
      academicYear: true,
    },
  },
  teacher: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      email: true,
      phone: true,
      user: { select: { id: true, name: true, email: true } },
      employee: {
        select: {
          id: true,
          photoUrl: true,
          roleTitle: true,
          phone: true,
          email: true,
        },
      },
    },
  },
  subjects: {
    orderBy: { name: "asc" },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  students: {
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      legajo: true,
      firstName: true,
      lastName: true,
      dni: true,
      photoUrl: true,
      status: true,
      guardians: {
        select: {
          relationship: true,
          isFinancialResponsible: true,
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              phone: true,
            },
          },
        },
      },
    },
  },
  _count: { select: { students: true } },
} satisfies Prisma.DivisionInclude;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!isAdminOrStaff(session.role) && !isTeacher(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await context.params;
    const division = await prisma.division.findUnique({
      where: { id },
      include: divisionDetailInclude,
    });

    if (!division) {
      return NextResponse.json(
        { error: "División no encontrada" },
        { status: 404 }
      );
    }

    if (isTeacher(session.role)) {
      const ownsDivision =
        session.teacherId &&
        (division.teacherId === session.teacherId ||
          division.subjects.some((s) => s.teacherId === session.teacherId));
      if (!ownsDivision) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
    }

    return NextResponse.json({ division });
  } catch (error) {
    console.error("GET /api/divisions/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener el detalle del curso" },
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
    const parsed = updateDivisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "División no encontrada" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const division = await prisma.division.update({
      where: { id },
      data: {
        teacherId: data.teacherId === "" ? null : data.teacherId,
        capacity: data.capacity,
      },
      include: divisionDetailInclude,
    });

    return NextResponse.json({ division });
  } catch (error) {
    console.error("PATCH /api/divisions/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar la división" },
      { status: 500 }
    );
  }
}
