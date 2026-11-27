import { DiscountType, FeeStatus, FeeType, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value.toNumber();
}

export interface ScholarshipInput {
  name?: string;
  type: DiscountType;
  value: Prisma.Decimal | number | string;
  isSiblingDiscount?: boolean;
  active?: boolean;
}

export function calculateScholarshipDiscount(
  baseAmount: number,
  scholarships: ScholarshipInput[]
): number {
  if (baseAmount <= 0 || scholarships.length === 0) return 0;

  let totalDiscount = 0;
  for (const s of scholarships) {
    if (s.active === false) continue;
    const val = toNumber(s.value);
    if (val <= 0) continue;

    if (s.type === DiscountType.PERCENTAGE) {
      totalDiscount += baseAmount * (val / 100);
    } else {
      totalDiscount += val;
    }
  }

  return roundCurrency(Math.min(baseAmount, Math.max(0, totalDiscount)));
}

export function calculateSiblingDiscount(params: {
  baseAmount: number;
  activeSiblingsCount: number;
  minChildren: number;
  discountPct: number;
}): number {
  const { baseAmount, activeSiblingsCount, minChildren, discountPct } = params;
  if (
    baseAmount <= 0 ||
    activeSiblingsCount < minChildren ||
    discountPct <= 0
  ) {
    return 0;
  }
  return roundCurrency(Math.min(baseAmount, baseAmount * (discountPct / 100)));
}

export function calculateLateFee(params: {
  baseAmount: number;
  discountAmount: number;
  surchargePercent: number;
}): number {
  const { baseAmount, discountAmount, surchargePercent } = params;
  if (surchargePercent <= 0) return 0;
  const netBase = Math.max(0, baseAmount - discountAmount);
  return roundCurrency(netBase * (surchargePercent / 100));
}

export function generateReceiptNumber(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REC-${yyyy}${mm}${dd}-${rand}`;
}

export interface GenerateMonthlyFeesParams {
  period: string;
  dueDate: Date;
  levelId?: string;
  applySiblingDiscount?: boolean;
}

export interface GenerateMonthlyFeesResult {
  period: string;
  academicYearId: string;
  createdCount: number;
  skippedCount: number;
  charges: Array<{
    id: string;
    studentId: string;
    studentName: string;
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
  }>;
}

export async function generateMonthlyFees(
  params: GenerateMonthlyFeesParams
): Promise<GenerateMonthlyFeesResult> {
  const { period, dueDate, levelId, applySiblingDiscount = true } = params;

  const academicYear =
    (await prisma.academicYear.findFirst({
      where: { isActive: true },
      orderBy: { year: "desc" },
    })) ??
    (await prisma.academicYear.findFirst({
      orderBy: { year: "desc" },
    }));

  if (!academicYear) {
    throw new Error("No existe un ciclo lectivo configurado en el sistema.");
  }

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      divisionId: { not: null },
      division: {
        grade: {
          academicYearId: academicYear.id,
          ...(levelId ? { levelId } : {}),
        },
      },
    },
    include: {
      division: {
        include: {
          grade: {
            include: {
              level: true,
            },
          },
        },
      },
      scholarships: {
        where: {
          academicYearId: academicYear.id,
          active: true,
        },
      },
      guardians: {
        include: {
          guardian: {
            include: {
              students: {
                include: {
                  student: {
                    select: { id: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const existingCharges = await prisma.feeCharge.findMany({
    where: {
      period,
      type: FeeType.MONTHLY_FEE,
      status: { not: FeeStatus.CANCELLED },
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true },
  });

  const alreadyBilledIds = new Set(existingCharges.map((c) => c.studentId));
  const siblingMinChildren = academicYear.siblingDiscountMinChildren;
  const siblingPct = toNumber(academicYear.siblingDiscountPct);

  const createdCharges: GenerateMonthlyFeesResult["charges"] = [];
  let skippedCount = 0;

  for (const student of students) {
    if (alreadyBilledIds.has(student.id) || !student.division) {
      skippedCount += 1;
      continue;
    }

    const grade = student.division.grade;
    const baseAmount = roundCurrency(toNumber(grade.monthlyFeeAmount));
    const scholarshipDiscount = calculateScholarshipDiscount(
      baseAmount,
      student.scholarships
    );

    const hasExplicitSiblingScholarship = student.scholarships.some(
      (s) => s.active && s.isSiblingDiscount
    );

    let siblingDiscount = 0;
    if (applySiblingDiscount && !hasExplicitSiblingScholarship) {
      const primaryLink =
        student.guardians.find((g) => g.isFinancialResponsible) ??
        student.guardians[0];

      if (primaryLink) {
        const activeSiblingsCount = primaryLink.guardian.students.filter(
          (link) => link.student.status === "ACTIVE"
        ).length;

        siblingDiscount = calculateSiblingDiscount({
          baseAmount,
          activeSiblingsCount,
          minChildren: siblingMinChildren,
          discountPct: siblingPct,
        });
      }
    }

    const discountAmount = roundCurrency(
      Math.min(baseAmount, scholarshipDiscount + siblingDiscount)
    );
    const finalAmount = roundCurrency(Math.max(0, baseAmount - discountAmount));
    const description = `Cuota mensual ${period} - ${grade.name} ${student.division.name}`;

    const created = await prisma.feeCharge.create({
      data: {
        studentId: student.id,
        academicYearId: academicYear.id,
        type: FeeType.MONTHLY_FEE,
        period,
        description,
        baseAmount,
        discountAmount,
        lateFeeAmount: 0,
        finalAmount,
        paidAmount: 0,
        dueDate,
        status: FeeStatus.PENDING,
      },
    });

    createdCharges.push({
      id: created.id,
      studentId: student.id,
      studentName: `${student.lastName}, ${student.firstName}`,
      baseAmount,
      discountAmount,
      finalAmount,
    });
  }

  return {
    period,
    academicYearId: academicYear.id,
    createdCount: createdCharges.length,
    skippedCount,
    charges: createdCharges,
  };
}
