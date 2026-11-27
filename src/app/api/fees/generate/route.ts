import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies, isAdminOrStaff } from "@/lib/auth";
import { generateMonthlyFees } from "@/lib/billing";

const generateFeesSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "El periodo debe tener formato YYYY-MM"),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  levelId: z.string().optional(),
  applySiblingDiscount: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateFeesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const dueDate = new Date(parsed.data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json(
      { error: "Fecha de vencimiento invalida" },
      { status: 400 }
    );
  }

  try {
    const result = await generateMonthlyFees({
      period: parsed.data.period,
      dueDate,
      levelId: parsed.data.levelId,
      applySiblingDiscount: parsed.data.applySiblingDiscount,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al generar cuotas mensuales";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
