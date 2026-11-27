import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: { select: { id: true } },
        guardian: { select: { id: true } },
      },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherId: user.teacher?.id ?? null,
      guardianId: user.guardian?.id ?? null,
    };

    const token = await signSessionToken(payload);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teacherId: payload.teacherId,
        guardianId: payload.guardianId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
