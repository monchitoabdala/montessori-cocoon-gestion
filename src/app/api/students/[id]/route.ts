import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
  isTeacher,
  SessionPayload,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateStudentSchema = z.object({
  legajo: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  dni: z.string().trim().min(6).optional(),
  birthDate: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "GRADUATED", "INACTIVE"]).optional(),
  divisionId: z.string().min(1).optional().nullable(),
  observations: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  bloodType: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  emergencyPhone: z.string().trim().optional().nullable(),
  allergiesNotes: z.string().trim().optional().nullable(),
});

async function canReadStudent(
  session: SessionPayload,
  studentId: string
): Promise<boolean> {
  if (isAdminOrStaff(session.role)) return true;

  if (isGuardian(session.role)) {
    if (!session.guardianId) return false;
    const link = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId: session.guardianId,
        },
      },
    });
    return Boolean(link);
  }

  if (isTeacher(session.role)) {
    if (!session.teacherId) return false;
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
    return Boolean(student);
  }

  return false;
}

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
    const allowed = await canReadStudent(session, id);
    if (!allowed) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        division: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            grade: {
              include: {
                level: true,
                academicYear: true,
              },
            },
          },
        },
        guardians: {
          include: {
            guardian: true,
          },
        },
        scholarships: {
          include: {
            academicYear: { select: { id: true, year: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        feeCharges: {
          orderBy: { dueDate: "desc" },
          include: {
            allocations: {
              include: {
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    method: true,
                    status: true,
                    receiptNumber: true,
                    paidAt: true,
                  },
                },
              },
            },
          },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 100,
        },
        gradeRecords: {
          orderBy: [{ term: "asc" }, { subject: { name: "asc" } }],
          include: {
            subject: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener el legajo del alumno" },
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
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    let birthDate: Date | undefined;
    if (data.birthDate) {
      birthDate = new Date(data.birthDate);
      if (Number.isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { error: "Fecha de nacimiento inválida" },
          { status: 400 }
        );
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        legajo: data.legajo,
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        birthDate,
        status: data.status,
        divisionId: data.divisionId,
        observations: data.observations === "" ? null : data.observations,
        photoUrl: data.photoUrl === "" ? null : data.photoUrl,
        address: data.address === "" ? null : data.address,
        bloodType: data.bloodType === "" ? null : data.bloodType,
        emergencyContact: data.emergencyContact === "" ? null : data.emergencyContact,
        emergencyPhone: data.emergencyPhone === "" ? null : data.emergencyPhone,
        allergiesNotes: data.allergiesNotes === "" ? null : data.allergiesNotes,
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
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error("PATCH /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el alumno" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Alumno no encontrado" },
        { status: 404 }
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json(
      { error: "Error al dar de baja al alumno" },
      { status: 500 }
    );
  }
}
