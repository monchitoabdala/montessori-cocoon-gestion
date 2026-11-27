import nodemailer from "nodemailer";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { toNumber } from "@/lib/billing";

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) return false;
  if (
    host === "smtp.example.com" ||
    user === "your_smtp_user" ||
    pass === "your_smtp_password"
  ) {
    return false;
  }
  return true;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountry =
    normalized.startsWith("54") || normalized.length > 11
      ? normalized
      : `549${normalized}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export async function sendEmailNotification(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; simulated: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return {
      sent: true,
      simulated: true,
    };
  }

  try {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ??
        "Escuela Montessori Cocoon <contacto@montessoricocoon.edu.ar>",
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return { sent: true, simulated: false };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al enviar email";
    return { sent: false, simulated: false, error: message };
  }
}

export function buildFeeNotificationMessage(params: {
  guardianName: string;
  studentName: string;
  description: string;
  period: string;
  finalAmount: number;
  paidAmount: number;
  dueDate: Date;
  status: string;
}): { subject: string; message: string } {
  const balance = Math.max(0, params.finalAmount - params.paidAmount);
  const dueStr = formatDateShort(params.dueDate);
  const amountStr = formatArs(balance > 0 ? balance : params.finalAmount);

  if (params.status === "PAID") {
    return {
      subject: `Confirmacion de pago - ${params.description} | Escuela Montessori Cocoon`,
      message: `Hola ${params.guardianName}, confirmamos la recepcion del pago correspondiente a ${params.description} de ${params.studentName} por ${formatArs(params.finalAmount)}. Muchas gracias.\n\nEscuela Montessori Cocoon\nRN9 4115, Funes, Santa Fe | contacto@montessoricocoon.edu.ar | +54 9 341 201 1300`,
    };
  }

  const overduePrefix =
    params.status === "OVERDUE"
      ? "Aviso de cuota vencida: "
      : "Recordatorio de vencimiento: ";

  return {
    subject: `${overduePrefix}${params.description} (${params.studentName}) | Escuela Montessori Cocoon`,
    message: `Hola ${params.guardianName}, le recordamos que ${params.description} de ${params.studentName} (periodo ${params.period}) tiene un saldo pendiente de ${amountStr} con vencimiento el ${dueStr}. Ante cualquier consulta, estamos a disposicion.\n\nEscuela Montessori Cocoon\nRN9 4115, Funes, Santa Fe | contacto@montessoricocoon.edu.ar | +54 9 341 201 1300`,
  };
}

export async function sendAndLogFeeNotification(params: {
  feeChargeId: string;
  channel: "EMAIL" | "WHATSAPP";
}) {
  const feeCharge = await prisma.feeCharge.findUnique({
    where: { id: params.feeChargeId },
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
    throw new Error("Cuota o cargo no encontrado.");
  }

  const guardianLink =
    feeCharge.student.guardians.find((g) => g.isFinancialResponsible) ??
    feeCharge.student.guardians[0];

  if (!guardianLink) {
    throw new Error("El alumno no tiene un tutor o responsable asignado.");
  }

  const guardian = guardianLink.guardian;
  const studentName = `${feeCharge.student.firstName} ${feeCharge.student.lastName}`;
  const guardianName = `${guardian.firstName} ${guardian.lastName}`;

  const { subject, message } = buildFeeNotificationMessage({
    guardianName,
    studentName,
    description: feeCharge.description,
    period: feeCharge.period,
    finalAmount: toNumber(feeCharge.finalAmount),
    paidAmount: toNumber(feeCharge.paidAmount),
    dueDate: feeCharge.dueDate,
    status: feeCharge.status,
  });

  if (params.channel === "EMAIL") {
    if (!guardian.email) {
      throw new Error("El tutor no tiene un correo electronico registrado.");
    }

    const emailResult = await sendEmailNotification({
      to: guardian.email,
      subject,
      text: message,
    });

    const log = await prisma.notificationLog.create({
      data: {
        channel: NotificationChannel.EMAIL,
        recipient: guardian.email,
        subject,
        message,
        status: emailResult.sent
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        errorMessage: emailResult.error ?? null,
        guardianId: guardian.id,
        studentId: feeCharge.studentId,
        feeChargeId: feeCharge.id,
        sentAt: emailResult.sent ? new Date() : null,
      },
    });

    return {
      log,
      simulated: emailResult.simulated,
      whatsappUrl: null as string | null,
    };
  }

  const phone = guardian.whatsapp || guardian.phone;
  if (!phone) {
    throw new Error("El tutor no tiene un telefono o WhatsApp registrado.");
  }

  const whatsappUrl = buildWhatsAppUrl(phone, message);
  const log = await prisma.notificationLog.create({
    data: {
      channel: NotificationChannel.WHATSAPP,
      recipient: phone,
      subject,
      message,
      status: NotificationStatus.SENT,
      guardianId: guardian.id,
      studentId: feeCharge.studentId,
      feeChargeId: feeCharge.id,
      sentAt: new Date(),
    },
  });

  return {
    log,
    simulated: false,
    whatsappUrl,
  };
}
