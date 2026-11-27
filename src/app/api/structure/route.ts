import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isTeacher,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createDivisionSchema = z.object({
  gradeId: z.string().min(1, "El grado es requerido"),
  name: z.string().trim().min(1, "El nombre de la división es requerido"),
  teacherId: z.string().min(1).optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().default(30),
});

const createGradeSchema = z.object({
  action: z.literal("CREATE_GRADE"),
  levelId: z.string().min(1, "El nivel es requerido"),
  academicYearId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "El nombre del grado es requerido"),
  order: z.coerce.number().int().nonnegative().optional(),
  monthlyFeeAmount: z.coerce.number().nonnegative("El arancel mensual debe ser >= 0"),
  enrollmentFeeAmount: z.coerce.number().nonnegative("La matrícula debe ser >= 0"),
});

const updateGradeSchema = z.object({
  gradeId: z.string().min(1, "gradeId es requerido"),
  name: z.string().trim().min(1).optional(),
  monthlyFeeAmount: z.coerce.number().nonnegative().optional(),
  enrollmentFeeAmount: z.coerce.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const mineOnly = req.nextUrl.searchParams.get("mine") === "true";
    const teacherFilter =
      mineOnly && isTeacher(session.role) && session.teacherId
        ? {
            OR: [
              { teacherId: session.teacherId },
              { subjects: { some: { teacherId: session.teacherId } } },
            ],
          }
        : undefined;

    const [academicYears, levels, grades, divisions, subjects] =
      await Promise.all([
        prisma.academicYear.findMany({
          orderBy: { year: "desc" },
        }),
        prisma.level.findMany({
          orderBy: { order: "asc" },
        }),
        prisma.grade.findMany({
          orderBy: [{ level: { order: "asc" } }, { order: "asc" }],
          include: {
            level: { select: { id: true, name: true, order: true } },
            academicYear: { select: { id: true, year: true, name: true, isActive: true } },
          },
        }),
        prisma.division.findMany({
          where: teacherFilter,
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
                order: true,
                level: { select: { id: true, name: true } },
                academicYearId: true,
              },
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employee: {
                  select: {
                    id: true,
                    photoUrl: true,
                    roleTitle: true,
                    department: true,
                  },
                },
              },
            },
            subjects: {
              select: {
                id: true,
                name: true,
                code: true,
                teacherId: true,
                teacher: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
              orderBy: { name: "asc" },
            },
            _count: {
              select: { students: true },
            },
          },
        }),
        prisma.subject.findMany({
          where:
            mineOnly && isTeacher(session.role) && session.teacherId
              ? {
                  OR: [
                    { teacherId: session.teacherId },
                    { division: { teacherId: session.teacherId } },
                  ],
                }
              : undefined,
          orderBy: { name: "asc" },
          include: {
            grade: { select: { id: true, name: true } },
            division: { select: { id: true, name: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
      ]);

    return NextResponse.json({
      academicYears,
      levels,
      grades,
      divisions,
      subjects,
    });
  } catch (error) {
    console.error("GET /api/structure error:", error);
    return NextResponse.json(
      { error: "Error al obtener la estructura académica" },
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

    if (body && typeof body === "object" && body.action === "CREATE_GRADE") {
      const parsedGrade = createGradeSchema.safeParse(body);
      if (!parsedGrade.success) {
        return NextResponse.json(
          { error: "Datos inválidos", details: parsedGrade.error.flatten() },
          { status: 400 }
        );
      }

      const gradeData = parsedGrade.data;
      let academicYearId = gradeData.academicYearId;
      if (!academicYearId) {
        const activeYear = await prisma.academicYear.findFirst({
          orderBy: [{ isActive: "desc" }, { year: "desc" }],
        });
        if (!activeYear) {
          return NextResponse.json(
            { error: "No hay ciclo lectivo configurado" },
            { status: 400 }
          );
        }
        academicYearId = activeYear.id;
      }

      const duplicate = await prisma.grade.findUnique({
        where: {
          academicYearId_levelId_name: {
            academicYearId,
            levelId: gradeData.levelId,
            name: gradeData.name,
          },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe un grado con ese nombre en ese nivel" },
          { status: 409 }
        );
      }

      const maxOrder = await prisma.grade.aggregate({
        where: { academicYearId, levelId: gradeData.levelId },
        _max: { order: true },
      });

      const grade = await prisma.grade.create({
        data: {
          academicYearId,
          levelId: gradeData.levelId,
          name: gradeData.name,
          order: gradeData.order ?? (maxOrder._max.order ?? 0) + 1,
          monthlyFeeAmount: gradeData.monthlyFeeAmount,
          enrollmentFeeAmount: gradeData.enrollmentFeeAmount,
        },
        include: {
          level: { select: { id: true, name: true, order: true } },
          academicYear: {
            select: { id: true, year: true, name: true, isActive: true },
          },
        },
      });

      return NextResponse.json({ grade }, { status: 201 });
    }

    const parsed = createDivisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { gradeId, name, teacherId, capacity } = parsed.data;
    const existing = await prisma.division.findUnique({
      where: {
        gradeId_name: { gradeId, name },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe esa división para el grado seleccionado" },
        { status: 409 }
      );
    }

    const division = await prisma.division.create({
      data: {
        gradeId,
        name,
        teacherId: teacherId || null,
        capacity,
      },
      include: {
        grade: {
          select: {
            id: true,
            name: true,
            order: true,
            level: { select: { id: true, name: true } },
            academicYearId: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employee: {
              select: {
                id: true,
                photoUrl: true,
                roleTitle: true,
                department: true,
              },
            },
          },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({ division }, { status: 201 });
  } catch (error) {
    console.error("POST /api/structure error:", error);
    return NextResponse.json(
      { error: "Error al crear el registro académico" },
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
    const parsed = updateGradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { gradeId, name, monthlyFeeAmount, enrollmentFeeAmount } = parsed.data;
    const existing = await prisma.grade.findUnique({ where: { id: gradeId } });
    if (!existing) {
      return NextResponse.json(
        { error: "Grado / arancel no encontrado" },
        { status: 404 }
      );
    }

    const grade = await prisma.grade.update({
      where: { id: gradeId },
      data: {
        name,
        monthlyFeeAmount,
        enrollmentFeeAmount,
      },
      include: {
        level: { select: { id: true, name: true, order: true } },
        academicYear: {
          select: { id: true, year: true, name: true, isActive: true },
        },
      },
    });

    return NextResponse.json({ grade });
  } catch (error) {
    console.error("PATCH /api/structure error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el arancel" },
      { status: 500 }
    );
  }
}
