import { FeeStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { MercadoPagoConfig, Payment as MPPayment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { generateReceiptNumber, roundCurrency, toNumber } from "@/lib/billing";
import prisma from "@/lib/prisma";

function isMercadoPagoConfigured(): boolean {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token || token === "your_mercadopago_access_token") return false;
  return true;
}

async function recordMercadoPagoPayment(params: {
  mpPaymentId: string;
  feeChargeId: string;
  paidAmount: number;
  mpPreferenceId?: string | null;
}) {
  const existing = await prisma.payment.findUnique({
    where: { mpPaymentId: params.mpPaymentId },
  });
  if (existing) {
    return { alreadyProcessed: true, payment: existing };
  }

  return prisma.$transaction(async (tx) => {
    const feeCharge = await tx.feeCharge.findUnique({
      where: { id: params.feeChargeId },
      include: {
        student: {
          include: {
            guardians: true,
          },
        },
      },
    });

    if (!feeCharge) {
      throw new Error("Cuota referenciada no encontrada");
    }

    const primaryGuardian =
      feeCharge.student.guardians.find((g) => g.isFinancialResponsible) ??
      feeCharge.student.guardians[0];

    const finalAmount = toNumber(feeCharge.finalAmount);
    const currentPaid = toNumber(feeCharge.paidAmount);
    const remaining = roundCurrency(Math.max(0, finalAmount - currentPaid));
    const appliedAmount = roundCurrency(
      Math.min(remaining > 0 ? remaining : params.paidAmount, params.paidAmount)
    );

    const payment = await tx.payment.create({
      data: {
        guardianId: primaryGuardian?.guardianId ?? null,
        amount: appliedAmount,
        method: PaymentMethod.MERCADOPAGO,
        status: PaymentStatus.COMPLETED,
        mpPaymentId: params.mpPaymentId,
        mpPreferenceId: params.mpPreferenceId ?? null,
        receiptNumber: generateReceiptNumber(),
        paidAt: new Date(),
        notes: `Pago acreditado via Mercado Pago (ID ${params.mpPaymentId})`,
      },
    });

    await tx.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        feeChargeId: feeCharge.id,
        amount: appliedAmount,
      },
    });

    const newPaidAmount = roundCurrency(currentPaid + appliedAmount);
    const newStatus =
      newPaidAmount >= finalAmount - 0.01
        ? FeeStatus.PAID
        : FeeStatus.PARTIAL;

    await tx.feeCharge.update({
      where: { id: feeCharge.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    return { alreadyProcessed: false, payment };
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  // Modo simulacion local cuando MERCADOPAGO_ACCESS_TOKEN es placeholder
  if (
    !isMercadoPagoConfigured() &&
    body?.simulated === true &&
    typeof body?.feeChargeId === "string"
  ) {
    const feeCharge = await prisma.feeCharge.findUnique({
      where: { id: body.feeChargeId },
    });
    if (!feeCharge) {
      return NextResponse.json(
        { error: "Cuota no encontrada" },
        { status: 404 }
      );
    }
    const remaining = roundCurrency(
      Math.max(
        0,
        toNumber(feeCharge.finalAmount) - toNumber(feeCharge.paidAmount)
      )
    );
    const amountToPay =
      typeof body.amount === "number" && body.amount > 0
        ? roundCurrency(body.amount)
        : remaining;

    if (amountToPay <= 0) {
      return NextResponse.json(
        { error: "La cuota no tiene saldo pendiente" },
        { status: 400 }
      );
    }

    const simId =
      typeof body.mpPaymentId === "string"
        ? body.mpPaymentId
        : `sim_mp_${Date.now()}`;

    const result = await recordMercadoPagoPayment({
      mpPaymentId: simId,
      feeChargeId: feeCharge.id,
      paidAmount: amountToPay,
      mpPreferenceId:
        typeof body.preferenceId === "string"
          ? body.preferenceId
          : `sim_pref_${feeCharge.id}`,
    });

    return NextResponse.json({ ok: true, simulated: true, ...result });
  }

  const topic = body?.type ?? searchParams.get("topic") ?? searchParams.get("type");
  const mpPaymentIdRaw =
    body?.data?.id ?? searchParams.get("data.id") ?? searchParams.get("id");

  if (topic !== "payment" && !String(body?.action ?? "").startsWith("payment.")) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!mpPaymentIdRaw) {
    return NextResponse.json(
      { error: "Falta identificador de pago" },
      { status: 400 }
    );
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "MERCADOPAGO_ACCESS_TOKEN no configurado",
    });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
    const mpPaymentClient = new MPPayment(client);
    const mpPayment = await mpPaymentClient.get({
      id: String(mpPaymentIdRaw),
    });

    if (mpPayment.status !== "approved") {
      return NextResponse.json({
        ok: true,
        status: mpPayment.status,
        processed: false,
      });
    }

    const feeChargeId = mpPayment.external_reference;
    if (!feeChargeId) {
      return NextResponse.json({
        ok: true,
        processed: false,
        reason: "Sin external_reference",
      });
    }

    const paidAmount = roundCurrency(mpPayment.transaction_amount ?? 0);
    if (paidAmount <= 0) {
      return NextResponse.json({
        ok: true,
        processed: false,
        reason: "Monto invalido",
      });
    }

    const result = await recordMercadoPagoPayment({
      mpPaymentId: String(mpPayment.id ?? mpPaymentIdRaw),
      feeChargeId,
      paidAmount,
    });

    return NextResponse.json({ ok: true, processed: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al procesar webhook de MP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
