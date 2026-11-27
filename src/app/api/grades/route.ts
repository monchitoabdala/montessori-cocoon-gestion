import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
  isTeacher,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const singleGradeSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  term: z.string().trim().min(1),
  score: z.coerce.number().min(0).max(10),
  observations: z.string().trim().optional().nullable(),
});

const bulkGradeSchema = z.object({
  subjectId: z.string().min(1),
  term: z.string().trim().min(1),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        score: z.coerce.number().min(0).max(10),
        observations: z.string().trim().optional().nullable(),
      })
    )
    .min(1),
});

const postGradesSchema = z.union([bulkGradeSchema, singleGradeSchema]);

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const divisionId = params.get("divisionId")?.trim();
    const subjectId = params.get("subjectId")?.trim();
    const term = params.get("term")?.trim();
    const studentId = params.get("studentId")?.trim();

    const andConditions: Prisma.GradeRecordWhereInput[] = [];

    if (isGuardian(session.role)) {
      if (!session.guardianId) {
        return NextResponse.json({ gradeRecords: [] });
      }
      andConditions.push({
        student: {
          guardians: { some: { guardianId: session.guardianId } },
        },
      });
    } else if (isTeacher(session.role)) {
      if (!session.teacherId) {
        return NextResponse.json({ gradeRecords: [] });
      }
      andConditions.push({
        subject: {
          OR: [
            { teacherId: session.teacherId },
            { division: { teacherId: session.teacherId } },
          ],
        },
      });
    }

    if (studentId) {
      andConditions.push({ studentId });
    }
    if (subjectId) {
      andConditions.push({ subjectId });
    }
    if (term) {
      andConditions.push({ term });
    }
    if (divisionId) {
      andConditions.push({ student: { divisionId } });
    }

    const gradeRecords = await prisma.gradeRecord.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : undefined,
      orderBy: [
        { term: "asc" },
        { student: { lastName: "asc" } },
        { subject: { name: "asc" } },
      ],
      include: {
        student: {
          select: {
            id: true,
            legajo: true,
            firstName: true,
            lastName: true,
            divisionId: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            gradeId: true,
            divisionId: true,
          },
        },
      },
    });

    return NextResponse.json({ gradeRecords });
  } catch (error) {
    console.error("GET /api/grades error:", error);
    return NextResponse.json(
      { error: "Error al obtener calificaciones" },
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
    const parsed = postGradesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const subjectId = payload.subjectId;
    const term = payload.term;
    const items =
      "records" in payload
        ? payload.records
        : [
            {
              studentId: payload.studentId,
              score: payload.score,
              observations: payload.observations,
            },
          ];

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        division: { select: { teacherId: true } },
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Materia no encontrada" },
        { status: 404 }
      );
    }

    if (isTeacher(session.role)) {
      const ownsSubject =
        session.teacherId &&
        (subject.teacherId === session.teacherId ||
          subject.division?.teacherId === session.teacherId);
      if (!ownsSubject) {
        return NextResponse.json(
          { error: "No tiene permisos sobre esta materia" },
          { status: 403 }
        );
      }
    }

    const results = await prisma.$transaction(
      items.map((item) =>
        prisma.gradeRecord.upsert({
          where: {
            studentId_subjectId_term: {
              studentId: item.studentId,
              subjectId,
              term,
            },
          },
          update: {
            score: item.score,
            observations: item.observations ?? null,
            recordedByUserId: session.userId,
          },
          create: {
            studentId: item.studentId,
            subjectId,
            term,
            score: item.score,
            observations: item.observations ?? null,
            recordedByUserId: session.userId,
          },
          include: {
            student: {
              select: { id: true, legajo: true, firstName: true, lastName: true },
            },
            subject: {
              select: { id: true, name: true, code: true },
            },
          },
        })
      )
    );

    return NextResponse.json({
      updated: results.length,
      gradeRecords: results,
    });
  } catch (error) {
    console.error("POST /api/grades error:", error);
    return NextResponse.json(
      { error: "Error al guardar calificaciones" },
      { status: 500 }
    );
  }
}
