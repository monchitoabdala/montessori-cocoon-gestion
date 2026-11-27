# ADR 001: Arquitectura Inicial del Sistema de Gestion Escolar

Fecha: 2026-11-27
Estado: Aceptada

## Contexto

Se requiere construir un sistema de gestion escolar completo (alumnos, cuotas, asistencia, boletines, portal de padres y portal docente) partiendo de la plantilla base TailAdmin Next.js, manteniendo los estandares de diseno sobrio y arquitectura limpia de Monch Agency.

## Decisiones

1. **Framework y Estructura**: Se utiliza Next.js 16 con App Router ubicado en `src/app`, React 19 y TypeScript estricto.
2. **Persistencia**: Se adopta PostgreSQL 16 ejecutado localmente mediante Docker Compose (`docker-compose.yml`) y modelado con Prisma ORM (`prisma/schema.prisma`).
3. **Autenticacion y Control de Acceso**: Se implementa autenticacion basada en cookies seguras firmadas con JWT (`jose`) y contraseñas con `bcryptjs`, protegiendo rutas por rol (`ADMIN`, `STAFF`, `TEACHER`, `GUARDIAN`) desde `src/middleware.ts`.
4. **Integraciones**:
   * Pagos en linea mediante el SDK oficial de Mercado Pago.
   * Notificaciones transaccionales por correo electronico con Nodemailer.
   * Generacion de recibos y boletines en PDF mediante `jspdf`.
5. **Estandar Visual (Monch Agency)**: Se respeta la base de TailAdmin adaptada a una estetica ejecutiva minimalista: bordes de `1px`, cero emojis en la interfaz y cero gradientes.

## Consecuencias

* El entorno local queda estandarizado con Docker y variables de entorno documentadas en `.env.example`.
* Cada modulo funcional se separa por rol y ruta bajo `src/app`, evitando acoplamiento entre la logica de administracion, docentes y familias.
