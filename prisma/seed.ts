import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AttendanceStatus,
  DiscountType,
  FeeStatus,
  FeeType,
  LeaveStatus,
  LeaveType,
  NotificationChannel,
  NotificationStatus,
  PaymentMethod,
  PaymentStatus,
  PayrollStatus,
  PrismaClient,
  Role,
  StudentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function avatarUrl(firstName: string, lastName: string, suffix = ""): string {
  const seed = encodeURIComponent(`${firstName}${lastName}${suffix}`);
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

async function main() {
  console.log("Iniciando seed ampliado de Gestion Escolar...");

  // 1. Limpiar datos previos en orden seguro de dependencias
  await prisma.notificationLog.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeCharge.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.gradeRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.studentGuardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.division.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.level.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.employeeLeave.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  // 2. Usuarios y Perfiles Docentes
  const [adminHash, staffHash, teacherHash, guardianHash] = await Promise.all([
    bcrypt.hash("Admin123!", 12),
    bcrypt.hash("Staff123!", 12),
    bcrypt.hash("Docente123!", 12),
    bcrypt.hash("Familia123!", 12),
  ]);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@montessoricocoon.edu.ar",
      passwordHash: adminHash,
      name: "Directora Carolina Mendez",
      role: Role.ADMIN,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: "secretaria@montessoricocoon.edu.ar",
      passwordHash: staffHash,
      name: "Federico Sosa (Secretaria)",
      role: Role.STAFF,
    },
  });

  const teacherUser1 = await prisma.user.create({
    data: {
      email: "guia.garcia@montessoricocoon.edu.ar",
      passwordHash: teacherHash,
      name: "Maria Laura Garcia",
      role: Role.TEACHER,
    },
  });

  const teacherUser2 = await prisma.user.create({
    data: {
      email: "guia.lopez@montessoricocoon.edu.ar",
      passwordHash: teacherHash,
      name: "Carlos Alberto Lopez",
      role: Role.TEACHER,
    },
  });

  const teacherUser3 = await prisma.user.create({
    data: {
      email: "guia.benitez@montessoricocoon.edu.ar",
      passwordHash: teacherHash,
      name: "Julieta Benitez",
      role: Role.TEACHER,
    },
  });

  const teacher1 = await prisma.teacher.create({
    data: {
      userId: teacherUser1.id,
      firstName: "Maria Laura",
      lastName: "Garcia",
      dni: "29456123",
      phone: "+54 9 341 452-8890",
      email: "guia.garcia@montessoricocoon.edu.ar",
      specialty: "Guia Montessori - Taller / Primaria",
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      userId: teacherUser2.id,
      firstName: "Carlos Alberto",
      lastName: "Lopez",
      dni: "31789456",
      phone: "+54 9 341 553-1140",
      email: "guia.lopez@montessoricocoon.edu.ar",
      specialty: "Guia Montessori - Comunidad de Adolescentes",
    },
  });

  const teacher3 = await prisma.teacher.create({
    data: {
      userId: teacherUser3.id,
      firstName: "Julieta",
      lastName: "Benitez",
      dni: "33654987",
      phone: "+54 9 341 478-3312",
      email: "guia.benitez@montessoricocoon.edu.ar",
      specialty: "Guia Montessori - Comunidad Infantil y Casa de Ninos",
    },
  });

  // 2b. Empleados (7 registros con avatar colorido, CUIL, salario base, licencias y sueldos)
  const employeesData = [
    {
      userId: adminUser.id,
      firstName: "Carolina",
      lastName: "Mendez",
      dni: "26111222",
      cuil: "27-26111222-4",
      email: "admin@montessoricocoon.edu.ar",
      phone: "+54 9 341 201-1300",
      photoUrl: avatarUrl("Carolina", "Mendez", "Emp1"),
      roleTitle: "Directora Pedagogica",
      department: "Direccion",
      baseSalary: 1450000,
      vacationDaysLimit: 28,
      hireDate: new Date("2018-03-01T00:00:00.000Z"),
      active: true,
    },
    {
      userId: staffUser.id,
      firstName: "Federico",
      lastName: "Sosa",
      dni: "30555444",
      cuil: "20-30555444-8",
      email: "secretaria@montessoricocoon.edu.ar",
      phone: "+54 9 341 201-1301",
      photoUrl: avatarUrl("Federico", "Sosa", "Emp2"),
      roleTitle: "Secretaria",
      department: "Administracion",
      baseSalary: 880000,
      vacationDaysLimit: 21,
      hireDate: new Date("2020-02-15T00:00:00.000Z"),
      active: true,
    },
    {
      userId: teacherUser1.id,
      teacherId: teacher1.id,
      firstName: "Maria Laura",
      lastName: "Garcia",
      dni: "29456123",
      cuil: "27-29456123-6",
      email: "guia.garcia@montessoricocoon.edu.ar",
      phone: "+54 9 341 452-8890",
      photoUrl: avatarUrl("MariaLaura", "Garcia", "Emp3"),
      roleTitle: "Guia Montessori",
      department: "Taller / Primaria",
      baseSalary: 980000,
      vacationDaysLimit: 21,
      hireDate: new Date("2019-03-01T00:00:00.000Z"),
      active: true,
    },
    {
      userId: teacherUser2.id,
      teacherId: teacher2.id,
      firstName: "Carlos Alberto",
      lastName: "Lopez",
      dni: "31789456",
      cuil: "20-31789456-2",
      email: "guia.lopez@montessoricocoon.edu.ar",
      phone: "+54 9 341 553-1140",
      photoUrl: avatarUrl("CarlosAlberto", "Lopez", "Emp4"),
      roleTitle: "Guia Montessori",
      department: "Comunidad de Adolescentes",
      baseSalary: 1050000,
      vacationDaysLimit: 14,
      hireDate: new Date("2021-03-01T00:00:00.000Z"),
      active: true,
    },
    {
      userId: teacherUser3.id,
      teacherId: teacher3.id,
      firstName: "Julieta",
      lastName: "Benitez",
      dni: "33654987",
      cuil: "27-33654987-9",
      email: "guia.benitez@montessoricocoon.edu.ar",
      phone: "+54 9 341 478-3312",
      photoUrl: avatarUrl("Julieta", "Benitez", "Emp5"),
      roleTitle: "Guia Montessori",
      department: "Casa de Ninos",
      baseSalary: 940000,
      vacationDaysLimit: 14,
      hireDate: new Date("2022-03-01T00:00:00.000Z"),
      active: true,
    },
    {
      firstName: "Ramiro",
      lastName: "Gimenez",
      dni: "35111888",
      cuil: "20-35111888-3",
      email: "asistente@montessoricocoon.edu.ar",
      phone: "+54 9 341 501-7788",
      photoUrl: avatarUrl("Ramiro", "Gimenez", "Emp6"),
      roleTitle: "Asistente de Ambiente",
      department: "Comunidad Infantil",
      baseSalary: 780000,
      vacationDaysLimit: 14,
      hireDate: new Date("2023-03-01T00:00:00.000Z"),
      active: true,
    },
    {
      firstName: "Silvina",
      lastName: "Peralta",
      dni: "28333999",
      cuil: "27-28333999-1",
      email: "tesoreria@montessoricocoon.edu.ar",
      phone: "+54 9 341 201-1302",
      photoUrl: avatarUrl("Silvina", "Peralta", "Emp7"),
      roleTitle: "Tesoreria",
      department: "Administracion",
      baseSalary: 990000,
      vacationDaysLimit: 21,
      hireDate: new Date("2019-08-10T00:00:00.000Z"),
      active: true,
    },
  ];

  const createdEmployees = [];
  for (const empData of employeesData) {
    const emp = await prisma.employee.create({ data: empData });
    createdEmployees.push(emp);
  }

  // Licencias y Vacaciones de Empleados (11 registros entre Noviembre y Diciembre 2026)
  await prisma.employeeLeave.createMany({
    data: [
      {
        employeeId: createdEmployees[0].id,
        type: LeaveType.VACATION,
        startDate: new Date("2026-12-21T00:00:00.000Z"),
        endDate: new Date("2026-12-30T00:00:00.000Z"),
        daysCount: 10,
        status: LeaveStatus.APPROVED,
        notes: "Primer tramo de vacaciones de verano.",
      },
      {
        employeeId: createdEmployees[0].id,
        type: LeaveType.PERSONAL,
        startDate: new Date("2026-11-06T00:00:00.000Z"),
        endDate: new Date("2026-11-06T00:00:00.000Z"),
        daysCount: 1,
        status: LeaveStatus.APPROVED,
        notes: "Asistencia a congreso directivo.",
      },
      {
        employeeId: createdEmployees[1].id,
        type: LeaveType.STUDY,
        startDate: new Date("2026-12-02T00:00:00.000Z"),
        endDate: new Date("2026-12-03T00:00:00.000Z"),
        daysCount: 2,
        status: LeaveStatus.PENDING,
        notes: "Examen final Licenciatura en Administracion.",
      },
      {
        employeeId: createdEmployees[1].id,
        type: LeaveType.VACATION,
        startDate: new Date("2026-11-16T00:00:00.000Z"),
        endDate: new Date("2026-11-20T00:00:00.000Z"),
        daysCount: 5,
        status: LeaveStatus.APPROVED,
        notes: "Semana de descanso anticipada.",
      },
      {
        employeeId: createdEmployees[2].id,
        type: LeaveType.MEDICAL,
        startDate: new Date("2026-11-11T00:00:00.000Z"),
        endDate: new Date("2026-11-13T00:00:00.000Z"),
        daysCount: 3,
        status: LeaveStatus.APPROVED,
        notes: "Reposo medico con certificado presentado.",
      },
      {
        employeeId: createdEmployees[2].id,
        type: LeaveType.VACATION,
        startDate: new Date("2026-12-14T00:00:00.000Z"),
        endDate: new Date("2026-12-18T00:00:00.000Z"),
        daysCount: 5,
        status: LeaveStatus.PENDING,
        notes: "Receso tras cierre de actas.",
      },
      {
        employeeId: createdEmployees[3].id,
        type: LeaveType.VACATION,
        startDate: new Date("2026-12-22T00:00:00.000Z"),
        endDate: new Date("2026-12-29T00:00:00.000Z"),
        daysCount: 8,
        status: LeaveStatus.PENDING,
        notes: "Solicitud de vacaciones fin de ciclo.",
      },
      {
        employeeId: createdEmployees[4].id,
        type: LeaveType.PERSONAL,
        startDate: new Date("2026-11-10T00:00:00.000Z"),
        endDate: new Date("2026-11-10T00:00:00.000Z"),
        daysCount: 1,
        status: LeaveStatus.APPROVED,
        notes: "Tramite personal autorizado por direccion.",
      },
      {
        employeeId: createdEmployees[4].id,
        type: LeaveType.STUDY,
        startDate: new Date("2026-12-09T00:00:00.000Z"),
        endDate: new Date("2026-12-10T00:00:00.000Z"),
        daysCount: 2,
        status: LeaveStatus.APPROVED,
        notes: "Coloquio de capacitacion docente.",
      },
      {
        employeeId: createdEmployees[5].id,
        type: LeaveType.MEDICAL,
        startDate: new Date("2026-11-24T00:00:00.000Z"),
        endDate: new Date("2026-11-25T00:00:00.000Z"),
        daysCount: 2,
        status: LeaveStatus.APPROVED,
        notes: "Control odontologico y reposo.",
      },
      {
        employeeId: createdEmployees[6].id,
        type: LeaveType.VACATION,
        startDate: new Date("2026-11-26T00:00:00.000Z"),
        endDate: new Date("2026-12-04T00:00:00.000Z"),
        daysCount: 9,
        status: LeaveStatus.APPROVED,
        notes: "Vacaciones escalonadas de cierre de mes.",
      },
    ],
  });

  // Liquidaciones de Sueldos (2026-10 PAID, 2026-11 PAID/PENDING)
  const payrollRows = [];
  for (let i = 0; i < createdEmployees.length; i++) {
    const emp = createdEmployees[i];
    const gross = emp.baseSalary ?? 850000;
    const deductions = Math.round(gross * 0.17); // Jubilacion + Obra Social + Ley 19032
    const net = gross - deductions;

    payrollRows.push({
      employeeId: emp.id,
      period: "2026-10",
      grossAmount: gross,
      deductions,
      netAmount: net,
      status: PayrollStatus.PAID,
      paidAt: new Date("2026-11-03T15:00:00.000Z"),
      notes: "Liquidacion Octubre 2026 acreditada por transferencia.",
    });

    const novPaid = i < 3;
    payrollRows.push({
      employeeId: emp.id,
      period: "2026-11",
      grossAmount: gross,
      deductions,
      netAmount: net,
      status: novPaid ? PayrollStatus.PAID : PayrollStatus.PENDING,
      paidAt: novPaid ? new Date("2026-11-27T12:00:00.000Z") : null,
      notes: novPaid
        ? "Liquidacion Noviembre 2026 acreditada."
        : "Liquidacion Noviembre 2026 pendiente de acreditacion.",
    });
  }

  await prisma.payrollRecord.createMany({ data: payrollRows });

  // 3. Ciclo Lectivo 2026 y Niveles
  const year2026 = await prisma.academicYear.create({
    data: {
      year: 2026,
      name: "Ciclo Lectivo 2026",
      startDate: new Date("2026-03-02T00:00:00.000Z"),
      endDate: new Date("2026-12-18T00:00:00.000Z"),
      isActive: true,
      siblingDiscountPct: 15,
      siblingDiscountMinChildren: 2,
      lateFeePct: 10,
    },
  });

  const [comunidadInfantil, casaDeNinos, tallerPrimaria, comunidadAdolescentes] =
    await Promise.all([
      prisma.level.create({ data: { name: "Comunidad Infantil", order: 1 } }),
      prisma.level.create({ data: { name: "Casa de Ninos", order: 2 } }),
      prisma.level.create({ data: { name: "Taller / Primaria", order: 3 } }),
      prisma.level.create({
        data: { name: "Comunidad de Adolescentes", order: 4 },
      }),
    ]);

  // 4. Grados / Comunidades y Aranceles Base (ARS)
  const nidoGrade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: comunidadInfantil.id,
      name: "Nido",
      order: 1,
      monthlyFeeAmount: 140000,
      enrollmentFeeAmount: 175000,
    },
  });

  const caminantesGrade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: comunidadInfantil.id,
      name: "Caminantes",
      order: 2,
      monthlyFeeAmount: 145000,
      enrollmentFeeAmount: 180000,
    },
  });

  const casaDeNinosGrade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: casaDeNinos.id,
      name: "Casa de Ninos",
      order: 1,
      monthlyFeeAmount: 150000,
      enrollmentFeeAmount: 185000,
    },
  });

  const taller1Grade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: tallerPrimaria.id,
      name: "Taller I (6 a 9)",
      order: 1,
      monthlyFeeAmount: 172500,
      enrollmentFeeAmount: 200000,
    },
  });

  const taller2Grade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: tallerPrimaria.id,
      name: "Taller II (9 a 12)",
      order: 2,
      monthlyFeeAmount: 177500,
      enrollmentFeeAmount: 205000,
    },
  });

  const adolescentes1Grade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: comunidadAdolescentes.id,
      name: "Adolescentes 1",
      order: 1,
      monthlyFeeAmount: 195000,
      enrollmentFeeAmount: 240000,
    },
  });

  const adolescentes2Grade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: comunidadAdolescentes.id,
      name: "Adolescentes 2",
      order: 2,
      monthlyFeeAmount: 198000,
      enrollmentFeeAmount: 240000,
    },
  });

  const adolescentes3Grade = await prisma.grade.create({
    data: {
      academicYearId: year2026.id,
      levelId: comunidadAdolescentes.id,
      name: "Adolescentes 3",
      order: 3,
      monthlyFeeAmount: 204000,
      enrollmentFeeAmount: 245000,
    },
  });

  // 5. Ambientes y Grupos (13 divisiones en las 4 comunidades Montessori)
  const divSala3A = await prisma.division.create({
    data: {
      gradeId: nidoGrade.id,
      name: "Sala Nido A",
      capacity: 18,
      teacherId: teacher3.id,
    },
  });

  const divSala4A = await prisma.division.create({
    data: {
      gradeId: caminantesGrade.id,
      name: "Caminantes A",
      capacity: 20,
      teacherId: teacher3.id,
    },
  });

  await prisma.division.create({
    data: {
      gradeId: caminantesGrade.id,
      name: "Caminantes B",
      capacity: 20,
      teacherId: teacher3.id,
    },
  });

  const divSala5A = await prisma.division.create({
    data: {
      gradeId: casaDeNinosGrade.id,
      name: "Ambiente A",
      capacity: 24,
      teacherId: teacher3.id,
    },
  });

  await prisma.division.createMany({
    data: [
      {
        gradeId: casaDeNinosGrade.id,
        name: "Ambiente B",
        capacity: 24,
        teacherId: teacher3.id,
      },
      {
        gradeId: casaDeNinosGrade.id,
        name: "Ambiente C",
        capacity: 24,
        teacherId: teacher3.id,
      },
    ],
  });

  const divPrimaria4A = await prisma.division.create({
    data: {
      gradeId: taller1Grade.id,
      name: "Taller I A",
      capacity: 26,
      teacherId: teacher1.id,
    },
  });

  const divPrimaria4B = await prisma.division.create({
    data: {
      gradeId: taller1Grade.id,
      name: "Taller I B",
      capacity: 26,
      teacherId: teacher1.id,
    },
  });

  await prisma.division.createMany({
    data: [
      {
        gradeId: taller2Grade.id,
        name: "Taller II A",
        capacity: 26,
        teacherId: teacher1.id,
      },
      {
        gradeId: taller2Grade.id,
        name: "Taller II B",
        capacity: 26,
        teacherId: teacher1.id,
      },
    ],
  });

  const divSecundaria1A = await prisma.division.create({
    data: {
      gradeId: adolescentes1Grade.id,
      name: "Grupo A",
      capacity: 28,
      teacherId: teacher2.id,
    },
  });

  const divSecundaria2A = await prisma.division.create({
    data: {
      gradeId: adolescentes2Grade.id,
      name: "Grupo A",
      capacity: 28,
      teacherId: teacher2.id,
    },
  });

  await prisma.division.create({
    data: {
      gradeId: adolescentes3Grade.id,
      name: "Grupo A",
      capacity: 28,
      teacherId: teacher2.id,
    },
  });

  // 6. Materias / Areas Montessori
  const matInicialJuego = await prisma.subject.create({
    data: {
      name: "Vida Practica y Sensorial",
      code: "CN-VP",
      gradeId: casaDeNinosGrade.id,
      divisionId: divSala5A.id,
      teacherId: teacher3.id,
    },
  });

  const matMatematica4A = await prisma.subject.create({
    data: {
      name: "Matematica Montessori",
      code: "T1A-MAT",
      gradeId: taller1Grade.id,
      divisionId: divPrimaria4A.id,
      teacherId: teacher1.id,
    },
  });

  const matLengua4A = await prisma.subject.create({
    data: {
      name: "Lenguaje y Expresion",
      code: "T1A-LEN",
      gradeId: taller1Grade.id,
      divisionId: divPrimaria4A.id,
      teacherId: teacher1.id,
    },
  });

  const matCiencias4A = await prisma.subject.create({
    data: {
      name: "Educacion Cosmica",
      code: "T1A-COS",
      gradeId: taller1Grade.id,
      divisionId: divPrimaria4A.id,
      teacherId: teacher1.id,
    },
  });

  const matMatematica4B = await prisma.subject.create({
    data: {
      name: "Matematica Montessori",
      code: "T1B-MAT",
      gradeId: taller1Grade.id,
      divisionId: divPrimaria4B.id,
      teacherId: teacher1.id,
    },
  });

  const matMatematicaSec1 = await prisma.subject.create({
    data: {
      name: "Matematica Aplicada",
      code: "AD1-MAT",
      gradeId: adolescentes1Grade.id,
      divisionId: divSecundaria1A.id,
      teacherId: teacher2.id,
    },
  });

  const matHistoriaSec1 = await prisma.subject.create({
    data: {
      name: "Humanidades e Historia",
      code: "AD1-HUM",
      gradeId: adolescentes1Grade.id,
      divisionId: divSecundaria1A.id,
      teacherId: teacher2.id,
    },
  });

  const matFisicaSec2 = await prisma.subject.create({
    data: {
      name: "Ciencias Experimentales",
      code: "AD2-CIE",
      gradeId: adolescentes2Grade.id,
      divisionId: divSecundaria2A.id,
      teacherId: teacher2.id,
    },
  });

  // 7. Familias (8 familias, usuarios de portal y tutores)
  const guardianUser1 = await prisma.user.create({
    data: {
      email: "familia.rodriguez@gmail.com",
      passwordHash: guardianHash,
      name: "Valeria Gomez",
      role: Role.GUARDIAN,
    },
  });

  const guardianUser2 = await prisma.user.create({
    data: {
      email: "familia.martinez@gmail.com",
      passwordHash: guardianHash,
      name: "Martin Martinez",
      role: Role.GUARDIAN,
    },
  });

  // Familia 1: Rodriguez (2 hijos)
  const gValeria = await prisma.guardian.create({
    data: {
      userId: guardianUser1.id,
      firstName: "Valeria",
      lastName: "Gomez",
      dni: "32456789",
      email: "familia.rodriguez@gmail.com",
      phone: "+54 9 11 6123-4401",
      whatsapp: "+5491161234401",
      address: "Av. Cabildo 2450, Piso 4 B, CABA",
      photoUrl: avatarUrl("Valeria", "Gomez", "Tut1"),
    },
  });

  const gDiego = await prisma.guardian.create({
    data: {
      firstName: "Diego",
      lastName: "Rodriguez",
      dni: "31222333",
      email: "diego.rodriguez@gmail.com",
      phone: "+54 9 11 6123-4402",
      whatsapp: "+5491161234402",
      address: "Av. Cabildo 2450, Piso 4 B, CABA",
      photoUrl: avatarUrl("Diego", "Rodriguez", "Tut2"),
    },
  });

  // Familia 2: Martinez (2 hijos)
  const gMartin = await prisma.guardian.create({
    data: {
      userId: guardianUser2.id,
      firstName: "Martin",
      lastName: "Martinez",
      dni: "30888999",
      email: "familia.martinez@gmail.com",
      phone: "+54 9 11 5490-2211",
      whatsapp: "+5491154902211",
      address: "Calle Uriburu 1120, Vicente Lopez, Buenos Aires",
      photoUrl: avatarUrl("Martin", "Martinez", "Tut3"),
    },
  });

  // Familia 3: Fernandez (2 hijos)
  const gAna = await prisma.guardian.create({
    data: {
      firstName: "Ana",
      lastName: "Fernandez",
      dni: "28765432",
      email: "ana.fernandez@gmail.com",
      phone: "+54 9 11 4980-7733",
      whatsapp: "+5491149807733",
      address: "Av. Santa Fe 3310, Piso 2 A, CABA",
      photoUrl: avatarUrl("Ana", "Fernandez", "Tut4"),
    },
  });

  // Familia 4: Alvarez (2 hijos)
  const gLucasAlvarez = await prisma.guardian.create({
    data: {
      firstName: "Lucas",
      lastName: "Alvarez",
      dni: "33111222",
      email: "lucas.alvarez@gmail.com",
      phone: "+54 9 11 5102-8844",
      whatsapp: "+5491151028844",
      address: "Juramento 1890, Belgrano, CABA",
      photoUrl: avatarUrl("Lucas", "Alvarez", "Tut5"),
    },
  });

  // Familia 5: Pereyra (2 hijos)
  const gRominaPereyra = await prisma.guardian.create({
    data: {
      firstName: "Romina",
      lastName: "Pereyra",
      dni: "34222555",
      email: "romina.pereyra@gmail.com",
      phone: "+54 9 11 6340-1920",
      whatsapp: "+5491163401920",
      address: "Av. Maipu 1420, Olivos, Buenos Aires",
      photoUrl: avatarUrl("Romina", "Pereyra", "Tut6"),
    },
  });

  // Familia 6: Castro (2 hijos)
  const gHernanCastro = await prisma.guardian.create({
    data: {
      firstName: "Hernan",
      lastName: "Castro",
      dni: "29999111",
      email: "hernan.castro@gmail.com",
      phone: "+54 9 11 4455-9012",
      whatsapp: "+5491144559012",
      address: "Conde 2150, Colegiales, CABA",
      photoUrl: avatarUrl("Hernan", "Castro", "Tut7"),
    },
  });

  // Familia 7: Acosta (2 hijos)
  const gMarcelaAcosta = await prisma.guardian.create({
    data: {
      firstName: "Marcela",
      lastName: "Acosta",
      dni: "31555666",
      email: "marcela.acosta@gmail.com",
      phone: "+54 9 11 5888-3401",
      whatsapp: "+5491158883401",
      address: "Av. Cramer 2780, CABA",
      photoUrl: avatarUrl("Marcela", "Acosta", "Tut8"),
    },
  });

  // Familia 8: Navarro (2 hijos)
  const gEstebanNavarro = await prisma.guardian.create({
    data: {
      firstName: "Esteban",
      lastName: "Navarro",
      dni: "30444777",
      email: "esteban.navarro@gmail.com",
      phone: "+54 9 11 4120-6677",
      whatsapp: "+5491141206677",
      address: "Moldes 1540, Belgrano, CABA",
      photoUrl: avatarUrl("Esteban", "Navarro", "Tut9"),
    },
  });

  // 8. 16 Alumnos distribuidos en Inicial, Primaria y Secundaria
  const studentsSeed = [
    {
      legajo: "2026-0001",
      firstName: "Mateo",
      lastName: "Rodriguez",
      dni: "48123456",
      birthDate: new Date("2016-05-14T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4A.id,
      address: "Av. Cabildo 2450, Piso 4 B, CABA",
      bloodType: "O+",
      emergencyContact: "Valeria Gomez (Madre)",
      emergencyPhone: "+54 9 11 6123-4401",
      allergiesNotes: "Alergia leve al polen en primavera. No requiere medicacion diaria.",
      observations: "Excelente desempeno en taller de robotica.",
      guardians: [
        { guardianId: gValeria.id, relationship: "Madre", isFinancialResponsible: true },
        { guardianId: gDiego.id, relationship: "Padre", isFinancialResponsible: false },
      ],
      feeAmount: 172500,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0002",
      firstName: "Sofia",
      lastName: "Rodriguez",
      dni: "45987654",
      birthDate: new Date("2013-09-22T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria1A.id,
      address: "Av. Cabildo 2450, Piso 4 B, CABA",
      bloodType: "A+",
      emergencyContact: "Diego Rodriguez (Padre)",
      emergencyPhone: "+54 9 11 6123-4402",
      allergiesNotes: null,
      observations: "Abanderada suplente 2025.",
      guardians: [
        { guardianId: gValeria.id, relationship: "Madre", isFinancialResponsible: true },
        { guardianId: gDiego.id, relationship: "Padre", isFinancialResponsible: false },
      ],
      feeAmount: 195000,
      discountPct: 25,
      scholarshipName: "Beca Merito Academico (25%)",
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0003",
      firstName: "Valentino",
      lastName: "Martinez",
      dni: "48333222",
      birthDate: new Date("2016-11-03T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4A.id,
      address: "Calle Uriburu 1120, Vicente Lopez, Buenos Aires",
      bloodType: "B+",
      emergencyContact: "Martin Martinez (Padre)",
      emergencyPhone: "+54 9 11 5490-2211",
      allergiesNotes: null,
      observations: "Participa del equipo escolar de futbol.",
      guardians: [
        { guardianId: gMartin.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 172500,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0004",
      firstName: "Mora",
      lastName: "Martinez",
      dni: "51444555",
      birthDate: new Date("2021-02-18T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSala5A.id,
      address: "Calle Uriburu 1120, Vicente Lopez, Buenos Aires",
      bloodType: "O+",
      emergencyContact: "Martin Martinez (Padre)",
      emergencyPhone: "+54 9 11 5490-2211",
      allergiesNotes: "Intolerancia leve a la lactosa. Trae vianda adaptada.",
      observations: null,
      guardians: [
        { guardianId: gMartin.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 150000,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0005",
      firstName: "Lucia",
      lastName: "Fernandez",
      dni: "45777888",
      birthDate: new Date("2013-07-09T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria1A.id,
      address: "Av. Santa Fe 3310, Piso 2 A, CABA",
      bloodType: "A-",
      emergencyContact: "Ana Fernandez (Madre)",
      emergencyPhone: "+54 9 11 4980-7733",
      allergiesNotes: null,
      observations: "Integrante del coro juvenil.",
      guardians: [
        { guardianId: gAna.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 195000,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0006",
      firstName: "Tomas",
      lastName: "Fernandez",
      dni: "48999001",
      birthDate: new Date("2016-03-19T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4B.id,
      address: "Av. Santa Fe 3310, Piso 2 A, CABA",
      bloodType: "A+",
      emergencyContact: "Ana Fernandez (Madre)",
      emergencyPhone: "+54 9 11 4980-7733",
      allergiesNotes: "Alergia al mani. Evitar colaciones con frutos secos.",
      observations: null,
      guardians: [
        { guardianId: gAna.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 172500,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0007",
      firstName: "Camila",
      lastName: "Alvarez",
      dni: "44612345",
      birthDate: new Date("2012-08-11T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria2A.id,
      address: "Juramento 1890, Belgrano, CABA",
      bloodType: "AB+",
      emergencyContact: "Lucas Alvarez (Padre)",
      emergencyPhone: "+54 9 11 5102-8844",
      allergiesNotes: null,
      observations: "Participa en Olimpiadas de Matematica.",
      guardians: [
        { guardianId: gLucasAlvarez.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 198000,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0008",
      firstName: "Bautista",
      lastName: "Alvarez",
      dni: "51888111",
      birthDate: new Date("2021-10-25T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSala4A.id,
      address: "Juramento 1890, Belgrano, CABA",
      bloodType: "O+",
      emergencyContact: "Lucas Alvarez (Padre)",
      emergencyPhone: "+54 9 11 5102-8844",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gLucasAlvarez.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 145000,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0009",
      firstName: "Martina",
      lastName: "Pereyra",
      dni: "48234567",
      birthDate: new Date("2016-01-30T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4A.id,
      address: "Av. Maipu 1420, Olivos, Buenos Aires",
      bloodType: "B-",
      emergencyContact: "Romina Pereyra (Madre)",
      emergencyPhone: "+54 9 11 6340-1920",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gRominaPereyra.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 172500,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0010",
      firstName: "Joaquin",
      lastName: "Pereyra",
      dni: "45345678",
      birthDate: new Date("2013-04-12T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria1A.id,
      address: "Av. Maipu 1420, Olivos, Buenos Aires",
      bloodType: "B+",
      emergencyContact: "Romina Pereyra (Madre)",
      emergencyPhone: "+54 9 11 6340-1920",
      allergiesNotes: "Asma leve inducido por ejercicio. Lleva inhalador en mochila.",
      observations: null,
      guardians: [
        { guardianId: gRominaPereyra.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 195000,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0011",
      firstName: "Emma",
      lastName: "Castro",
      dni: "51678901",
      birthDate: new Date("2021-06-05T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSala5A.id,
      address: "Conde 2150, Colegiales, CABA",
      bloodType: "O-",
      emergencyContact: "Hernan Castro (Padre)",
      emergencyPhone: "+54 9 11 4455-9012",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gHernanCastro.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 150000,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0012",
      firstName: "Santiago",
      lastName: "Castro",
      dni: "44789012",
      birthDate: new Date("2012-12-15T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria2A.id,
      address: "Conde 2150, Colegiales, CABA",
      bloodType: "O+",
      emergencyContact: "Hernan Castro (Padre)",
      emergencyPhone: "+54 9 11 4455-9012",
      allergiesNotes: null,
      observations: "Delegado de curso 2do A.",
      guardians: [
        { guardianId: gHernanCastro.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 198000,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0013",
      firstName: "Olivia",
      lastName: "Acosta",
      dni: "48901234",
      birthDate: new Date("2016-07-21T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4B.id,
      address: "Av. Cramer 2780, CABA",
      bloodType: "A+",
      emergencyContact: "Marcela Acosta (Madre)",
      emergencyPhone: "+54 9 11 5888-3401",
      allergiesNotes: "Celiaquia. Requiere menu libre de TACC en comedor.",
      observations: null,
      guardians: [
        { guardianId: gMarcelaAcosta.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 172500,
      discountPct: 0,
      scholarshipName: null,
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0014",
      firstName: "Benicio",
      lastName: "Acosta",
      dni: "52123456",
      birthDate: new Date("2022-01-10T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSala3A.id,
      address: "Av. Cramer 2780, CABA",
      bloodType: "A+",
      emergencyContact: "Marcela Acosta (Madre)",
      emergencyPhone: "+54 9 11 5888-3401",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gMarcelaAcosta.id, relationship: "Madre", isFinancialResponsible: true },
      ],
      feeAmount: 145000,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
    {
      legajo: "2026-0015",
      firstName: "Delfina",
      lastName: "Navarro",
      dni: "45012345",
      birthDate: new Date("2013-11-08T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divSecundaria1A.id,
      address: "Moldes 1540, Belgrano, CABA",
      bloodType: "O+",
      emergencyContact: "Esteban Navarro (Padre)",
      emergencyPhone: "+54 9 11 4120-6677",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gEstebanNavarro.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 195000,
      discountPct: 20,
      scholarshipName: "Beca Socioeconomica (20%)",
      isSiblingDiscount: false,
    },
    {
      legajo: "2026-0016",
      firstName: "Santino",
      lastName: "Navarro",
      dni: "48555444",
      birthDate: new Date("2016-09-14T00:00:00.000Z"),
      status: StudentStatus.ACTIVE,
      divisionId: divPrimaria4B.id,
      address: "Moldes 1540, Belgrano, CABA",
      bloodType: "O+",
      emergencyContact: "Esteban Navarro (Padre)",
      emergencyPhone: "+54 9 11 4120-6677",
      allergiesNotes: null,
      observations: null,
      guardians: [
        { guardianId: gEstebanNavarro.id, relationship: "Padre", isFinancialResponsible: true },
      ],
      feeAmount: 172500,
      discountPct: 15,
      scholarshipName: "Descuento por Hermano (15%)",
      isSiblingDiscount: true,
    },
  ];

  const createdStudents: Array<{
    id: string;
    legajo: string;
    firstName: string;
    lastName: string;
    divisionId: string | null;
    feeAmount: number;
    discountPct: number;
    financialGuardianId: string;
  }> = [];

  for (const item of studentsSeed) {
    const student = await prisma.student.create({
      data: {
        legajo: item.legajo,
        firstName: item.firstName,
        lastName: item.lastName,
        dni: item.dni,
        birthDate: item.birthDate,
        status: item.status,
        divisionId: item.divisionId,
        photoUrl: avatarUrl(item.firstName, item.lastName),
        address: item.address,
        bloodType: item.bloodType,
        emergencyContact: item.emergencyContact,
        emergencyPhone: item.emergencyPhone,
        allergiesNotes: item.allergiesNotes,
        observations: item.observations,
      },
    });

    await prisma.studentGuardian.createMany({
      data: item.guardians.map((g) => ({
        studentId: student.id,
        guardianId: g.guardianId,
        relationship: g.relationship,
        isFinancialResponsible: g.isFinancialResponsible,
      })),
    });

    if (item.scholarshipName && item.discountPct > 0) {
      await prisma.scholarship.create({
        data: {
          studentId: student.id,
          academicYearId: year2026.id,
          name: item.scholarshipName,
          type: DiscountType.PERCENTAGE,
          value: item.discountPct,
          isSiblingDiscount: item.isSiblingDiscount,
        },
      });
    }

    const finGuardian =
      item.guardians.find((g) => g.isFinancialResponsible) ?? item.guardians[0];

    createdStudents.push({
      id: student.id,
      legajo: student.legajo,
      firstName: student.firstName,
      lastName: student.lastName,
      divisionId: student.divisionId,
      feeAmount: item.feeAmount,
      discountPct: item.discountPct,
      financialGuardianId: finGuardian.guardianId,
    });
  }

  // 9. Cuotas (2026-09, 2026-10, 2026-11) + Pagos y Asignaciones
  const periods = [
    {
      period: "2026-09",
      label: "Septiembre 2026",
      dueDate: new Date("2026-09-10T00:00:00.000Z"),
    },
    {
      period: "2026-10",
      label: "Octubre 2026",
      dueDate: new Date("2026-10-10T00:00:00.000Z"),
    },
    {
      period: "2026-11",
      label: "Noviembre 2026",
      dueDate: new Date("2026-11-10T00:00:00.000Z"),
    },
  ];

  let receiptCounter = 1;
  const paymentMethods = [
    PaymentMethod.TRANSFER,
    PaymentMethod.MERCADOPAGO,
    PaymentMethod.CASH,
    PaymentMethod.CARD,
  ];

  let overdueFeeForLog: {
    id: string;
    studentId: string;
    guardianId: string;
    finalAmount: number;
    studentName: string;
  } | null = null;
  let paidPaymentForLog: {
    id: string;
    guardianId: string;
    receiptNumber: string;
    amount: number;
  } | null = null;

  for (let idx = 0; idx < createdStudents.length; idx++) {
    const st = createdStudents[idx];
    const discountAmount = Math.round((st.feeAmount * st.discountPct) / 100);
    const netAmount = st.feeAmount - discountAmount;

    for (let pIdx = 0; pIdx < periods.length; pIdx++) {
      const per = periods[pIdx];

      // Mezcla realista:
      // 2026-09: casi todos PAID, 2 OVERDUE
      // 2026-10: mezcla PAID, PARTIAL, OVERDUE
      // 2026-11: mezcla PAID, PENDING, OVERDUE
      let status: FeeStatus = FeeStatus.PENDING;
      let lateFee = 0;
      let paidAmount = 0;

      if (pIdx === 0) {
        if (idx % 7 === 1) {
          status = FeeStatus.OVERDUE;
          lateFee = Math.round(netAmount * 0.1);
        } else {
          status = FeeStatus.PAID;
          paidAmount = netAmount;
        }
      } else if (pIdx === 1) {
        if (idx % 4 === 1) {
          status = FeeStatus.OVERDUE;
          lateFee = Math.round(netAmount * 0.1);
        } else if (idx % 5 === 2) {
          status = FeeStatus.PARTIAL;
          paidAmount = Math.round(netAmount * 0.5);
        } else {
          status = FeeStatus.PAID;
          paidAmount = netAmount;
        }
      } else {
        if (idx % 3 === 0) {
          status = FeeStatus.PAID;
          paidAmount = netAmount;
        } else if (idx % 4 === 1) {
          status = FeeStatus.OVERDUE;
          lateFee = Math.round(netAmount * 0.1);
        } else {
          status = FeeStatus.PENDING;
        }
      }

      const finalAmount = netAmount + lateFee;
      const feeCharge = await prisma.feeCharge.create({
        data: {
          studentId: st.id,
          academicYearId: year2026.id,
          type: FeeType.MONTHLY_FEE,
          period: per.period,
          description: `Cuota ${per.label}`,
          baseAmount: st.feeAmount,
          discountAmount,
          lateFeeAmount: lateFee,
          finalAmount,
          paidAmount,
          dueDate: per.dueDate,
          status,
        },
      });

      if (status === FeeStatus.OVERDUE && !overdueFeeForLog && idx === 1) {
        overdueFeeForLog = {
          id: feeCharge.id,
          studentId: st.id,
          guardianId: st.financialGuardianId,
          finalAmount,
          studentName: `${st.firstName} ${st.lastName}`,
        };
      }

      if (paidAmount > 0) {
        const method = paymentMethods[(idx + pIdx) % paymentMethods.length];
        const receiptNumber = `REC-2026-${String(receiptCounter++).padStart(5, "0")}`;
        const paidAt = new Date(
          per.dueDate.getTime() - (idx % 4) * 24 * 60 * 60 * 1000
        );

        const payment = await prisma.payment.create({
          data: {
            guardianId: st.financialGuardianId,
            amount: paidAmount,
            method,
            status: PaymentStatus.COMPLETED,
            mpPreferenceId:
              method === PaymentMethod.MERCADOPAGO
                ? `PREF-2026-${receiptCounter}`
                : null,
            mpPaymentId:
              method === PaymentMethod.MERCADOPAGO
                ? `MP-102938${receiptCounter}`
                : null,
            receiptNumber,
            paidAt,
            notes: `Cobro ${per.label} - ${st.firstName} ${st.lastName}`,
            recordedByUserId:
              method === PaymentMethod.MERCADOPAGO ? null : adminUser.id,
          },
        });

        await prisma.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            feeChargeId: feeCharge.id,
            amount: paidAmount,
          },
        });

        if (!paidPaymentForLog && idx === 0 && pIdx === 1) {
          paidPaymentForLog = {
            id: payment.id,
            guardianId: st.financialGuardianId,
            receiptNumber,
            amount: paidAmount,
          };
        }
      }
    }
  }

  // 10. Asistencia reciente (5 dias habiles)
  const attendanceDates = [
    new Date("2026-11-16T00:00:00.000Z"),
    new Date("2026-11-17T00:00:00.000Z"),
    new Date("2026-11-18T00:00:00.000Z"),
    new Date("2026-11-19T00:00:00.000Z"),
    new Date("2026-11-20T00:00:00.000Z"),
  ];

  const attendanceRows: Array<{
    studentId: string;
    date: Date;
    status: AttendanceStatus;
    observations: string | null;
    recordedByUserId: string;
  }> = [];

  for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
    const st = createdStudents[sIdx];
    const recorderId =
      st.divisionId === divSecundaria1A.id || st.divisionId === divSecundaria2A.id
        ? teacherUser2.id
        : st.divisionId === divSala4A.id || st.divisionId === divSala5A.id
          ? teacherUser3.id
          : teacherUser1.id;

    for (let dIdx = 0; dIdx < attendanceDates.length; dIdx++) {
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let observations: string | null = null;

      if ((sIdx + dIdx) % 11 === 0) {
        status = AttendanceStatus.ABSENT;
        observations = "Ausente con aviso familiar";
      } else if ((sIdx + dIdx) % 9 === 0) {
        status = AttendanceStatus.LATE;
        observations = "Ingreso 10 minutos tarde";
      } else if ((sIdx + dIdx) % 13 === 0) {
        status = AttendanceStatus.EXCUSED;
        observations = "Certificado medico presentado";
      }

      attendanceRows.push({
        studentId: st.id,
        date: attendanceDates[dIdx],
        status,
        observations,
        recordedByUserId: recorderId,
      });
    }
  }

  await prisma.attendance.createMany({ data: attendanceRows });

  // 11. Boletines de Calificaciones (1er Trimestre y 2do Trimestre)
  const subjectsByDivision: Record<
    string,
    Array<{ id: string; recorderId: string }>
  > = {
    [divSala5A.id]: [{ id: matInicialJuego.id, recorderId: teacherUser3.id }],
    [divPrimaria4A.id]: [
      { id: matMatematica4A.id, recorderId: teacherUser1.id },
      { id: matLengua4A.id, recorderId: teacherUser1.id },
      { id: matCiencias4A.id, recorderId: teacherUser1.id },
    ],
    [divPrimaria4B.id]: [{ id: matMatematica4B.id, recorderId: teacherUser1.id }],
    [divSecundaria1A.id]: [
      { id: matMatematicaSec1.id, recorderId: teacherUser2.id },
      { id: matHistoriaSec1.id, recorderId: teacherUser2.id },
    ],
    [divSecundaria2A.id]: [{ id: matFisicaSec2.id, recorderId: teacherUser2.id }],
  };

  const gradeRows: Array<{
    studentId: string;
    subjectId: string;
    term: string;
    score: number;
    observations: string;
    recordedByUserId: string;
  }> = [];

  const terms = ["1er Trimestre", "2do Trimestre"];
  const obsPool = [
    "Excelente participacion y compromiso en clase.",
    "Muy buen progreso durante el trimestre.",
    "Cumple en tiempo y forma con trabajos practicos.",
    "Desempeno destacado en evaluaciones escritas.",
  ];

  for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
    const st = createdStudents[sIdx];
    const subs = st.divisionId ? subjectsByDivision[st.divisionId] ?? [] : [];

    for (let subIdx = 0; subIdx < subs.length; subIdx++) {
      const sub = subs[subIdx];
      for (let tIdx = 0; tIdx < terms.length; tIdx++) {
        const baseScore = 7 + ((sIdx + subIdx + tIdx) % 6) * 0.5;
        gradeRows.push({
          studentId: st.id,
          subjectId: sub.id,
          term: terms[tIdx],
          score: Math.min(10, baseScore),
          observations: obsPool[(sIdx + subIdx + tIdx) % obsPool.length],
          recordedByUserId: sub.recorderId,
        });
      }
    }
  }

  await prisma.gradeRecord.createMany({ data: gradeRows });

  // 12. Logs de Notificaciones
  const notifLogs: Array<{
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    message: string;
    status: NotificationStatus;
    guardianId: string;
    studentId?: string;
    feeChargeId?: string;
    paymentId?: string;
    sentAt: Date;
  }> = [];

  if (paidPaymentForLog) {
    notifLogs.push({
      channel: NotificationChannel.EMAIL,
      recipient: "familia.rodriguez@gmail.com",
      subject: `Recibo de pago ${paidPaymentForLog.receiptNumber}`,
      message: `Confirmamos su pago por $${paidPaymentForLog.amount.toLocaleString("es-AR")} correspondiente a la cuota escolar.`,
      status: NotificationStatus.SENT,
      guardianId: paidPaymentForLog.guardianId,
      paymentId: paidPaymentForLog.id,
      sentAt: new Date("2026-10-08T11:16:00.000Z"),
    });
  }

  if (overdueFeeForLog) {
    notifLogs.push({
      channel: NotificationChannel.WHATSAPP,
      recipient: "+5491161234401",
      message: `Recordatorio: la cuota de ${overdueFeeForLog.studentName} se encuentra vencida ($${overdueFeeForLog.finalAmount.toLocaleString("es-AR")}).`,
      status: NotificationStatus.SENT,
      guardianId: overdueFeeForLog.guardianId,
      studentId: overdueFeeForLog.studentId,
      feeChargeId: overdueFeeForLog.id,
      sentAt: new Date("2026-11-15T10:00:00.000Z"),
    });
  }

  notifLogs.push({
    channel: NotificationChannel.EMAIL,
    recipient: "familia.martinez@gmail.com",
    subject: "Resumen mensual de cuenta - Noviembre 2026",
    message: "Ya se encuentran disponibles las cuotas de Noviembre 2026 en el Portal Familiar.",
    status: NotificationStatus.SENT,
    guardianId: gMartin.id,
    sentAt: new Date("2026-11-02T09:30:00.000Z"),
  });

  await prisma.notificationLog.createMany({ data: notifLogs });

  console.log(
    `Seed completado: ${createdStudents.length} alumnos, ${attendanceRows.length} asistencias, ${gradeRows.length} calificaciones.`
  );
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
