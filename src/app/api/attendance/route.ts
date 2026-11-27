import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
  isTeacher,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bulkAttendanceSchema = z.object({
  divisionId: z.string().min(1, "divisionId es requerido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha YYYY-MM-DD"),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        observations: z.string().trim().optional().nullable(),
      })
    )
    .min(1, "Se requiere al menos un registro"),
});

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function isTeacherAssignedToDivision(
  teacherId: string,
  divisionId: string
): Promise<boolean> {
  const division = await prisma.division.findFirst({
    where: {
      id: divisionId,
      OR: [
        { teacherId },
        { subjects: { some: { teacherId } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(division);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const divisionId = params.get("divisionId")?.trim();
    const dateStr = params.get("date")?.trim();
    const studentId = params.get("studentId")?.trim();

    if (studentId) {
      if (isGuardian(session.role)) {
        if (!session.guardianId) {
          return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }
        const link = await prisma.studentGuardian.findUnique({
          where: {
            studentId_guardianId: {
              studentId,
              guardianId: session.guardianId,
            },
          },
        });
        if (!link) {
          return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }
      } else if (isTeacher(session.role)) {
        if (!session.teacherId) {
          return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }
        const student = await prisma.student.findFirst({
          where: {
            id: studentId,
            division: {
              OR: [
                { teacherId: session.teacherId },
                { subjects: { some: { teacherId: session.teacherId } } },
              ],
            },
          },
          select: { id: true },
        });
        if (!student) {
          return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }
      }

      const attendances = await prisma.attendance.findMany({
        where: { studentId },
        orderBy: { date: "desc" },
        include: {
          student: {
            select: { id: true, legajo: true, firstName: true, lastName: true },
          },
        },
      });
      return NextResponse.json({ attendances });
    }

    if (divisionId && dateStr) {
      if (isGuardian(session.role)) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      if (isTeacher(session.role)) {
        if (
          !session.teacherId ||
          !(await isTeacherAssignedToDivision(session.teacherId, divisionId))
        ) {
          return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json(
          { error: "Formato de fecha inválido (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      const targetDate = parseDateOnly(dateStr);

      const [students, attendances] = await Promise.all([
        prisma.student.findMany({
          where: { divisionId, status: "ACTIVE" },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            legajo: true,
            firstName: true,
            lastName: true,
            dni: true,
          },
        }),
        prisma.attendance.findMany({
          where: {
            date: targetDate,
            student: { divisionId },
          },
          include: {
            student: {
              select: { id: true, legajo: true, firstName: true, lastName: true },
            },
          },
        }),
      ]);

      return NextResponse.json({
        divisionId,
        date: dateStr,
        students,
        attendances,
      });
    }

    return NextResponse.json(
      { error: "Debe indicar divisionId y date, o studentId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json(
      { error: "Error al obtener asistencia" },
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
    if (!isAdminOrStaff(session.role) && !isTeacher(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = bulkAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { divisionId, date, records } = parsed.data;

    if (isTeacher(session.role)) {
      if (
        !session.teacherId ||
        !(await isTeacherAssignedToDivision(session.teacherId, divisionId))
      ) {
        return NextResponse.json(
          { error: "No tiene permisos sobre esta división" },
          { status: 403 }
        );
      }
    }

    const targetDate = parseDateOnly(date);

    const results = await prisma.$transaction(
      records.map((rec) =>
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: rec.studentId,
              date: targetDate,
            },
          },
          update: {
            status: rec.status,
            observations: rec.observations ?? null,
            recordedByUserId: session.userId,
          },
          create: {
            studentId: rec.studentId,
            date: targetDate,
            status: rec.status,
            observations: rec.observations ?? null,
            recordedByUserId: session.userId,
          },
        })
      )
    );

    return NextResponse.json({
      updated: results.length,
      date,
      divisionId,
      attendances: results,
    });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { error: "Error al guardar la asistencia" },
      { status: 500 }
    );
  }
}
