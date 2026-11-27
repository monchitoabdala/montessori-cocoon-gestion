# ADR 002: Arquitectura de Entidades Nucleares y Relaciones

## Contexto
El sistema de Gestion Escolar organiza su modelo de datos sobre PostgreSQL y Prisma ORM alrededor de 6 entidades nucleares operativas: **Cursos**, **Alumnos**, **Empleados**, **Cuotas**, **Asistencias** y **Tutores/Padres**.

## Entidades y Claves Relacionales

1. **Cursos (`Level`, `Grade`, `Division`, `Subject`, `AcademicYear`)**
   - `AcademicYear.id` -> agrupa `Grade` (`academicYearId`), `FeeCharge` (`academicYearId`) y `Scholarship` (`academicYearId`).
   - `Level.id` -> agrupa `Grade` (`levelId`).
   - `Grade.id` -> agrupa `Division` (`gradeId`) y `Subject` (`gradeId`), definiendo `monthlyFeeAmount` y `enrollmentFeeAmount`.
   - `Division.id` -> asigna `teacherId` (`Teacher.id`) y agrupa `Student` (`divisionId`) y `Subject` (`divisionId`).

2. **Alumnos (`Student`)**
   - Identificador unico: `Student.id` (`cuid`) y `legajo` / `dni` unicos.
   - Vinculado a su curso mediante `divisionId` -> `Division.id`.
   - Incluye ficha medica y de contacto (`photoUrl`, `address`, `bloodType`, `emergencyContact`, `emergencyPhone`, `allergiesNotes`).

3. **Empleados (`Employee`, `Teacher`, `User`)**
   - `Employee.id` centraliza la ficha de personal escolar (`roleTitle`, `department`, `hireDate`, `photoUrl`, `dni`, `active`).
   - Vinculo opcional 1:1 con `User` (`userId` -> `User.id`) para acceso al sistema (`ADMIN`, `STAFF`, `TEACHER`).
   - Vinculo opcional 1:1 con `Teacher` (`teacherId` -> `Teacher.id`) para preservar la asignacion academica directa a `Division` y `Subject`.

4. **Tutores / Padres (`Guardian`, `StudentGuardian`)**
   - `Guardian.id` representa a madres, padres y responsables legales (`firstName`, `lastName`, `dni`, `email`, `phone`, `whatsapp`, `address`, `photoUrl`).
   - Vinculo opcional 1:1 con `User` (`userId` -> `User.id`) con rol `GUARDIAN` para acceso al Portal Familiar.
   - Relacion N:M con `Student` a traves de `StudentGuardian` (`studentId`, `guardianId`, `relationship`, `isFinancialResponsible`).

5. **Cuotas y Cobranzas (`FeeCharge`, `Payment`, `PaymentAllocation`, `Scholarship`)**
   - `FeeCharge.id` vinculado a `studentId` -> `Student.id` y `academicYearId` -> `AcademicYear.id`.
   - `Payment.id` vinculado opcionalmente a `guardianId` -> `Guardian.id` y `recordedByUserId` -> `User.id`.
   - `PaymentAllocation` distribuye cada pago (`paymentId`) sobre una o mas cuotas (`feeChargeId`).
   - `Scholarship` aplica becas o descuentos por hermano por `studentId` y `academicYearId`.

6. **Asistencias (`Attendance`)**
   - `Attendance.id` con clave unica compuesta `(studentId, date)`.
   - Vinculado a `studentId` -> `Student.id` y `recordedByUserId` -> `User.id`.
