import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            email: true,
            phone: true,
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
            subjects: {
              select: {
                id: true,
                name: true,
                code: true,
                divisionId: true,
                gradeId: true,
              },
            },
          },
        },
        guardian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            email: true,
            phone: true,
            whatsapp: true,
            address: true,
            students: {
              select: {
                relationship: true,
                isFinancialResponsible: true,
                student: {
                  select: {
                    id: true,
                    legajo: true,
                    firstName: true,
                    lastName: true,
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teacherId: user.teacher?.id ?? null,
        guardianId: user.guardian?.id ?? null,
        teacher: user.teacher,
        guardian: user.guardian,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
