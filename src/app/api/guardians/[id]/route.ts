import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateGuardianSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  dni: z.string().trim().min(6).optional(),
  email: z.string().trim().email("Email inválido").optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  addStudentIds: z.array(z.string().min(1)).optional(),
  removeStudentIds: z.array(z.string().min(1)).optional(),
  studentIds: z.array(z.string().min(1)).optional(),
  relationship: z.string().trim().min(1).optional(),
  isFinancialResponsible: z.boolean().optional(),
});

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
    const guardian = await prisma.guardian.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, active: true } },
        students: {
          include: {
            student: {
              select: {
                id: true,
                legajo: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                status: true,
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
                feeCharges: {
                  orderBy: { dueDate: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      return NextResponse.json(
        { error: "Responsable no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ guardian });
  } catch (error) {
    console.error("GET /api/guardians/[id] error:", error);
    return NextResponse.json(
      { error: "Error al obtener la ficha familiar" },
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
    const parsed = updateGuardianSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Responsable no encontrado" },
        { status: 404 }
      );
    }

    const data = parsed.data;
    const relationship = data.relationship ?? "Tutor";
    const isFinancialResponsible = data.isFinancialResponsible ?? true;

    const guardian = await prisma.$transaction(async (tx) => {
      if (data.studentIds !== undefined) {
        await tx.studentGuardian.deleteMany({ where: { guardianId: id } });
        if (data.studentIds.length > 0) {
          await tx.studentGuardian.createMany({
            data: data.studentIds.map((studentId) => ({
              studentId,
              guardianId: id,
              relationship,
              isFinancialResponsible,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        if (data.removeStudentIds && data.removeStudentIds.length > 0) {
          await tx.studentGuardian.deleteMany({
            where: {
              guardianId: id,
              studentId: { in: data.removeStudentIds },
            },
          });
        }
        if (data.addStudentIds && data.addStudentIds.length > 0) {
          await tx.studentGuardian.createMany({
            data: data.addStudentIds.map((studentId) => ({
              studentId,
              guardianId: id,
              relationship,
              isFinancialResponsible,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.guardian.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni,
          email:
            data.email === ""
              ? null
              : data.email !== undefined && data.email !== null
                ? data.email.toLowerCase()
                : undefined,
          phone: data.phone === "" ? null : data.phone,
          whatsapp: data.whatsapp === "" ? null : data.whatsapp,
          address: data.address === "" ? null : data.address,
          photoUrl: data.photoUrl === "" ? null : data.photoUrl,
        },
        include: {
          user: { select: { id: true, email: true, active: true } },
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  legajo: true,
                  firstName: true,
                  lastName: true,
                  status: true,
                  photoUrl: true,
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
          },
        },
      });
    });

    return NextResponse.json({ guardian });
  } catch (error) {
    console.error("PATCH /api/guardians/[id] error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el responsable" },
      { status: 500 }
    );
  }
}
