import { Prisma, StudentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
  isTeacher,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const guardianLinkSchema = z.object({
  guardianId: z.string().min(1),
  relationship: z.string().trim().min(1).default("Tutor"),
  isFinancialResponsible: z.boolean().optional().default(false),
});

const scholarshipInputSchema = z.object({
  academicYearId: z.string().min(1).optional(),
  name: z.string().trim().min(1),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  value: z.coerce.number().positive(),
  notes: z.string().trim().optional().nullable(),
});

const createStudentSchema = z.object({
  legajo: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  dni: z.string().trim().min(6, "DNI inválido"),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  status: z.enum(["ACTIVE", "GRADUATED", "INACTIVE"]).optional().default("ACTIVE"),
  divisionId: z.string().min(1).optional().nullable(),
  observations: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  bloodType: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  emergencyPhone: z.string().trim().optional().nullable(),
  allergiesNotes: z.string().trim().optional().nullable(),
  guardians: z.array(guardianLinkSchema).optional(),
  scholarship: scholarshipInputSchema.optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const search = params.get("search")?.trim();
    const divisionId = params.get("divisionId")?.trim();
    const levelId = params.get("levelId")?.trim();
    const statusParam = params.get("status")?.trim();
    const guardianIdParam = params.get("guardianId")?.trim();

    const andConditions: Prisma.StudentWhereInput[] = [];

    if (isGuardian(session.role)) {
      if (!session.guardianId) {
        return NextResponse.json({ students: [] });
      }
      andConditions.push({
        guardians: { some: { guardianId: session.guardianId } },
      });
    } else if (isTeacher(session.role)) {
      if (!session.teacherId) {
        return NextResponse.json({ students: [] });
      }
      andConditions.push({
        division: {
          OR: [
            { teacherId: session.teacherId },
            { subjects: { some: { teacherId: session.teacherId } } },
          ],
        },
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { dni: { contains: search, mode: "insensitive" } },
          { legajo: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (divisionId) {
      andConditions.push({ divisionId });
    }

    if (levelId) {
      andConditions.push({
        division: { grade: { levelId } },
      });
    }

    if (
      statusParam &&
      (statusParam === "ACTIVE" ||
        statusParam === "GRADUATED" ||
        statusParam === "INACTIVE")
    ) {
      andConditions.push({ status: statusParam as StudentStatus });
    }

    if (guardianIdParam && isAdminOrStaff(session.role)) {
      andConditions.push({
        guardians: { some: { guardianId: guardianIdParam } },
      });
    }

    const students = await prisma.student.findMany({
      where: andConditions.length > 0 ? { AND: andConditions } : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
        guardians: {
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dni: true,
                email: true,
                phone: true,
                whatsapp: true,
                photoUrl: true,
              },
            },
          },
        },
        scholarships: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            type: true,
            value: true,
            isSiblingDiscount: true,
            active: true,
          },
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { error: "Error al listar alumnos" },
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
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const birthDate = new Date(data.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { error: "Fecha de nacimiento inválida" },
        { status: 400 }
      );
    }

    const existingDni = await prisma.student.findUnique({
      where: { dni: data.dni },
    });
    if (existingDni) {
      return NextResponse.json(
        { error: "Ya existe un alumno con ese DNI" },
        { status: 409 }
      );
    }

    const legajo =
      data.legajo ??
      `LEG-${new Date().getFullYear()}-${data.dni.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const existingLegajo = await prisma.student.findUnique({
      where: { legajo },
    });
    if (existingLegajo) {
      return NextResponse.json(
        { error: "Ya existe un alumno con ese legajo" },
        { status: 409 }
      );
    }

    let academicYearId = data.scholarship?.academicYearId;
    if (data.scholarship && !academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
        orderBy: { year: "desc" },
      });
      if (!activeYear) {
        return NextResponse.json(
          { error: "No hay ciclo lectivo activo para asignar la beca" },
          { status: 400 }
        );
      }
      academicYearId = activeYear.id;
    }

    const student = await prisma.student.create({
      data: {
        legajo,
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        birthDate,
        status: data.status,
        divisionId: data.divisionId ?? null,
        observations: data.observations || null,
        photoUrl: data.photoUrl || null,
        address: data.address || null,
        bloodType: data.bloodType || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        allergiesNotes: data.allergiesNotes || null,
        guardians:
          data.guardians && data.guardians.length > 0
            ? {
                create: data.guardians.map((g) => ({
                  guardianId: g.guardianId,
                  relationship: g.relationship,
                  isFinancialResponsible: g.isFinancialResponsible,
                })),
              }
            : undefined,
        scholarships:
          data.scholarship && academicYearId
            ? {
                create: {
                  academicYearId,
                  name: data.scholarship.name,
                  type: data.scholarship.type,
                  value: data.scholarship.value,
                  notes: data.scholarship.notes ?? null,
                },
              }
            : undefined,
      },
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
        guardians: {
          include: { guardian: true },
        },
        scholarships: true,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error("POST /api/students error:", error);
    return NextResponse.json(
      { error: "Error al crear el alumno" },
      { status: 500 }
    );
  }
}
