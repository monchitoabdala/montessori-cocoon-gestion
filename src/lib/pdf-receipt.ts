import { jsPDF } from "jspdf";

export interface ReceiptItem {
  studentName: string;
  legajo: string;
  divisionLabel: string;
  description: string;
  period: string;
  baseAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  finalAmount: number;
  allocatedAmount: number;
}

export interface ReceiptData {
  receiptNumber: string;
  paidAt: Date | string;
  method: string;
  amount: number;
  notes?: string | null;
  guardianName?: string | null;
  guardianDni?: string | null;
  guardianEmail?: string | null;
  items: ReceiptItem[];
  schoolName?: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia bancaria",
  CARD: "Tarjeta",
  MERCADOPAGO: "Mercado Pago",
};

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateAr(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function generatePaymentReceiptPdf(data: ReceiptData): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Encabezado institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(data.schoolName ?? "Escuela Montessori Cocoon", margin, y);

  doc.setFontSize(12);
  doc.text("RECIBO DE PAGO", pageWidth - margin, y, { align: "right" });

  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text("RN9 4115, Funes, Santa Fe", margin, y);
  doc.text(`Nro: ${data.receiptNumber}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 4.5;
  doc.text(
    "contacto@montessoricocoon.edu.ar | +54 9 341 201 1300",
    margin,
    y
  );
  doc.text(`Fecha de pago: ${formatDateAr(data.paidAt)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 4.5;
  doc.setFontSize(8);
  doc.text("Comprobante no valido como factura fiscal", margin, y);

  y += 5;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // Datos del responsable y medio de pago
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Datos del Responsable de Pago", margin, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Nombre: ${data.guardianName || "Consumidor Final"}`, margin, y);
  if (data.guardianDni) {
    doc.text(`DNI: ${data.guardianDni}`, margin + 95, y);
  }

  y += 5;
  if (data.guardianEmail) {
    doc.text(`Email: ${data.guardianEmail}`, margin, y);
  }
  const methodLabel = METHOD_LABELS[data.method] ?? data.method;
  doc.text(`Medio de pago: ${methodLabel}`, margin + 95, y);

  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);

  // Detalle de conceptos abonados
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text("Detalle de Conceptos Abonados", margin, y);

  y += 5;
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text("Alumno / Concepto", margin + 2, y + 4.8);
  doc.text("Periodo", margin + 102, y + 4.8);
  doc.text("Importe Abonado", pageWidth - margin - 2, y + 4.8, {
    align: "right",
  });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const item of data.items) {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(
      `${item.studentName} (Legajo ${item.legajo}${item.divisionLabel ? ` - ${item.divisionLabel}` : ""})`,
      margin + 2,
      y
    );

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(item.period, margin + 102, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(formatArs(item.allocatedAmount), pageWidth - margin - 2, y, {
      align: "right",
    });

    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    const detailParts = [
      item.description,
      `Base: ${formatArs(item.baseAmount)}`,
    ];
    if (item.discountAmount > 0) {
      detailParts.push(`Desc: -${formatArs(item.discountAmount)}`);
    }
    if (item.lateFeeAmount > 0) {
      detailParts.push(`Mora: +${formatArs(item.lateFeeAmount)}`);
    }
    doc.text(detailParts.join(" | "), margin + 2, y, {
      maxWidth: contentWidth - 4,
    });

    y += 6;
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFontSize(9);
  }

  // Total abonado
  y += 3;
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(17, 24, 39);
  doc.text("TOTAL ABONADO", margin + 2, y);
  doc.text(formatArs(data.amount), pageWidth - margin - 2, y, {
    align: "right",
  });

  if (data.notes) {
    y += 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text("Observaciones:", margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, margin, y, { maxWidth: contentWidth });
  }

  // Pie de pagina
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Documento generado electronicamente por Escuela Montessori Cocoon.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
