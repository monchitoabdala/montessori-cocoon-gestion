import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  hashPassword,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createGuardianSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido"),
  lastName: z.string().trim().min(1, "El apellido es requerido"),
  dni: z.string().trim().min(6, "DNI inválido"),
  email: z.string().trim().email("Email inválido").optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  studentIds: z.array(z.string().min(1)).optional(),
  relationship: z.string().trim().min(1).optional(),
  createUserAccount: z.boolean().optional().default(false),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!isAdminOrStaff(session.role) && !isGuardian(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search")?.trim();

    const where = isGuardian(session.role)
      ? { id: session.guardianId ?? "__none__" }
      : search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { dni: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : undefined;

    const guardians = await prisma.guardian.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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

    return NextResponse.json({ guardians });
  } catch (error) {
    console.error("GET /api/guardians error:", error);
    return NextResponse.json(
      { error: "Error al listar responsables" },
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
    const parsed = createGuardianSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.createUserAccount && !data.email) {
      return NextResponse.json(
        { error: "El email es obligatorio para crear una cuenta de acceso" },
        { status: 400 }
      );
    }

    const existingDni = await prisma.guardian.findUnique({
      where: { dni: data.dni },
    });
    if (existingDni) {
      return NextResponse.json(
        { error: "Ya existe un responsable con ese DNI" },
        { status: 409 }
      );
    }

    const emailNormalized = data.email ? data.email.toLowerCase() : null;
    if (data.createUserAccount && emailNormalized) {
      const existingUser = await prisma.user.findUnique({
        where: { email: emailNormalized },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Ya existe una cuenta de usuario con ese email" },
          { status: 409 }
        );
      }
    }

    const guardian = await prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      if (data.createUserAccount && emailNormalized) {
        const rawPassword = data.password ?? data.dni;
        const passwordHash = await hashPassword(rawPassword);
        const user = await tx.user.create({
          data: {
            email: emailNormalized,
            passwordHash,
            name: `${data.firstName} ${data.lastName}`,
            role: "GUARDIAN",
          },
        });
        userId = user.id;
      }

      return tx.guardian.create({
        data: {
          userId,
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni,
          email: emailNormalized,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          address: data.address || null,
          photoUrl: data.photoUrl || null,
          students:
            data.studentIds && data.studentIds.length > 0
              ? {
                  create: data.studentIds.map((studentId) => ({
                    studentId,
                    relationship: data.relationship ?? "Tutor",
                    isFinancialResponsible: true,
                  })),
                }
              : undefined,
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
                  photoUrl: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ guardian }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guardians error:", error);
    return NextResponse.json(
      { error: "Error al crear el responsable" },
      { status: 500 }
    );
  }
}
