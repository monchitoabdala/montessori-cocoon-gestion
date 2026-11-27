# Memoria del Proyecto: Sistema de Gestion Escolar

Proyecto desarrollado bajo los estandares de Monch Agency.

## Vision General

Plataforma integral de gestion escolar orientada a instituciones educativas de Argentina. Cubre administracion de alumnos, familias y tutores, estructura academica (ciclo lectivo, niveles, grados, divisiones y materias), facturacion y cobro de cuotas y matriculas (con becas, descuentos por hermanos y soporte para Mercado Pago), registro de asistencia, boletines de calificaciones, portal para padres y portal para docentes.

## Stack Tecnologico

* Base de interfaz: TailAdmin Free Next.js Admin Dashboard
* Framework: Next.js 16 (App Router bajo `src/app`), React 19, TypeScript
* Estilos: Tailwind CSS v4
* Base de datos y ORM: PostgreSQL 16 (Docker local) + Prisma ORM
* Autenticacion y sesiones: Cookies HTTP con JWT (`jose`) y hash de contraseñas (`bcryptjs`)
* Validacion: Zod
* Pagos: Mercado Pago SDK (`mercadopago`)
* Notificaciones: Nodemailer (`nodemailer`)
* Documentos PDF: jsPDF (`jspdf`) para recibos y boletines

## Estandares de Diseno y Calidad (Monch Agency)

* Interfaz sobria y minimalista de nivel ejecutivo.
* Uso estricto de bordes de `1px` para delimitar tarjetas, tablas y paneles.
* Cero emojis en la interfaz de usuario.
* Cero gradientes decorativos en fondos, botones o encabezados.
* Accesibilidad, jerarquia tipografica clara y contraste legible en modo claro y oscuro.

## Estructura Inicial de Trabajo

* Rama de desarrollo: `feat/school-management`
* Documentacion viva en `docs/`:
  * `docs/PROJECT_MEMORY.md`
  * `docs/CLIENT_GUIDE.md`
  * `docs/decisions/001-initial-architecture.md`
