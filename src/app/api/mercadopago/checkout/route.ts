import { FeeStatus } from "@prisma/client";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionFromCookies,
  isAdminOrStaff,
  isGuardian,
} from "@/lib/auth";
import { roundCurrency, toNumber } from "@/lib/billing";
import prisma from "@/lib/prisma";

const checkoutSchema = z.object({
  feeChargeId: z.string().min(1, "feeChargeId es requerido"),
});

function isMercadoPagoConfigured(): boolean {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) return false;
  if (token === "your_mercadopago_access_token") return false;
  return true;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdminOrStaff(session.role) && !isGuardian(session.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const feeCharge = await prisma.feeCharge.findUnique({
    where: { id: parsed.data.feeChargeId },
    include: {
      student: {
        include: {
          guardians: {
            include: {
              guardian: true,
            },
          },
        },
      },
    },
  });

  if (!feeCharge) {
    return NextResponse.json(
      { error: "Cuota no encontrada" },
      { status: 404 }
    );
  }

  if (isGuardian(session.role)) {
    const ownsStudent = feeCharge.student.guardians.some(
      (g) => g.guardianId === session.guardianId
    );
    if (!ownsStudent) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
  }

  if (feeCharge.status === FeeStatus.CANCELLED) {
    return NextResponse.json(
      { error: "La cuota esta cancelada" },
      { status: 400 }
    );
  }

  if (feeCharge.status === FeeStatus.PAID) {
    return NextResponse.json(
      { error: "La cuota ya se encuentra pagada" },
      { status: 400 }
    );
  }

  const remaining = roundCurrency(
    Math.max(
      0,
      toNumber(feeCharge.finalAmount) - toNumber(feeCharge.paidAmount)
    )
  );

  if (remaining <= 0) {
    return NextResponse.json(
      { error: "No hay saldo pendiente para abonar" },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  if (!isMercadoPagoConfigured()) {
    const simPreferenceId = `sim_pref_${feeCharge.id}`;
    const checkoutUrl = `${appUrl}/portal?mp_sim=1&feeChargeId=${encodeURIComponent(
      feeCharge.id
    )}&amount=${remaining}&preferenceId=${encodeURIComponent(simPreferenceId)}`;

    return NextResponse.json({
      simulated: true,
      preferenceId: simPreferenceId,
      checkoutUrl,
      amount: remaining,
    });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
    const preference = new Preference(client);

    const primaryGuardian =
      feeCharge.student.guardians.find((g) => g.isFinancialResponsible)
        ?.guardian ?? feeCharge.student.guardians[0]?.guardian;

    const studentFullName = `${feeCharge.student.firstName} ${feeCharge.student.lastName}`;

    const prefResponse = await preference.create({
      body: {
        items: [
          {
            id: feeCharge.id,
            title: `${feeCharge.description} (${studentFullName})`,
            quantity: 1,
            unit_price: remaining,
            currency_id: "ARS",
          },
        ],
        payer: primaryGuardian?.email
          ? {
              email: primaryGuardian.email,
              name: primaryGuardian.firstName,
              surname: primaryGuardian.lastName,
            }
          : undefined,
        external_reference: feeCharge.id,
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        back_urls: {
          success: `${appUrl}/portal?mp=success&feeChargeId=${feeCharge.id}`,
          failure: `${appUrl}/portal?mp=failure&feeChargeId=${feeCharge.id}`,
          pending: `${appUrl}/portal?mp=pending&feeChargeId=${feeCharge.id}`,
        },
        auto_return: "approved",
      },
    });

    return NextResponse.json({
      simulated: false,
      preferenceId: prefResponse.id,
      checkoutUrl:
        prefResponse.init_point ?? prefResponse.sandbox_init_point ?? "",
      amount: remaining,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error al crear preferencia en Mercado Pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
