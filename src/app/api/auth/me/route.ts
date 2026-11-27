import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateMeSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").optional(),
  email: z.string().trim().email("Correo electrónico inválido").optional(),
  phone: z.string().trim().optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

const userMeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
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
    },
  },
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
      photoUrl: true,
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
  },
} satisfies Prisma.UserSelect;

type UserMePayload = Prisma.UserGetPayload<{ select: typeof userMeSelect }>;

function formatMeUser(user: UserMePayload) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photoUrl: user.employee?.photoUrl ?? user.guardian?.photoUrl ?? null,
    employeeId: user.employee?.id ?? null,
    teacherId: user.teacher?.id ?? null,
    guardianId: user.guardian?.id ?? null,
    employee: user.employee,
    teacher: user.teacher,
    guardian: user.guardian,
  };
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: userMeSelect,
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    return NextResponse.json({
      user: formatMeUser(user),
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
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

    const body = await req.json().catch(() => null);
    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        passwordHash: true,
        employee: { select: { id: true } },
        teacher: { select: { id: true } },
        guardian: { select: { id: true } },
      },
    });

    if (!existing || !existing.active) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const data = parsed.data;
    const normalizedEmail = data.email ? data.email.toLowerCase() : undefined;

    if (normalizedEmail && normalizedEmail !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== existing.id) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con ese correo electrónico" },
          { status: 409 }
        );
      }
    }

    let newPasswordHash: string | undefined;
    if (data.newPassword !== undefined && data.newPassword.length > 0) {
      if (data.newPassword.length < 6) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }
      if (!data.currentPassword || data.currentPassword.length === 0) {
        return NextResponse.json(
          { error: "Debe ingresar su contraseña actual para cambiarla" },
          { status: 400 }
        );
      }
      const isCurrentValid = await verifyPassword(
        data.currentPassword,
        existing.passwordHash
      );
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta" },
          { status: 400 }
        );
      }
      newPasswordHash = await hashPassword(data.newPassword);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          email: normalizedEmail,
          passwordHash: newPasswordHash,
        },
      });

      const phoneUpdate =
        data.phone === undefined ? undefined : data.phone === "" ? null : data.phone;
      const photoUrlUpdate =
        data.photoUrl === undefined
          ? undefined
          : data.photoUrl === ""
            ? null
            : data.photoUrl;

      if (existing.employee) {
        await tx.employee.update({
          where: { id: existing.employee.id },
          data: {
            phone: phoneUpdate,
            photoUrl: photoUrlUpdate,
            email: normalizedEmail,
          },
        });
      }

      if (existing.guardian) {
        await tx.guardian.update({
          where: { id: existing.guardian.id },
          data: {
            phone: phoneUpdate,
            photoUrl: photoUrlUpdate,
            email: normalizedEmail,
          },
        });
      }

      if (existing.teacher) {
        await tx.teacher.update({
          where: { id: existing.teacher.id },
          data: {
            phone: phoneUpdate,
            email: normalizedEmail,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: existing.id },
        select: userMeSelect,
      });
    });

    const token = await signSessionToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      teacherId: updatedUser.teacher?.id ?? null,
      guardianId: updatedUser.guardian?.id ?? null,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: formatMeUser(updatedUser),
    });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el perfil" },
      { status: 500 }
    );
  }
}
