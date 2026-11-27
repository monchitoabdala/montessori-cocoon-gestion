import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export type UserRole = "ADMIN" | "STAFF" | "TEACHER" | "GUARDIAN";

export const SESSION_COOKIE_NAME = "gestion_escolar_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  teacherId?: string | null;
  guardianId?: string | null;
}

const VALID_ROLES: readonly UserRole[] = [
  "ADMIN",
  "STAFF",
  "TEACHER",
  "GUARDIAN",
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET environment variable must be set (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signSessionToken(
  payload: SessionPayload,
  expiresInSeconds: number = SESSION_DURATION_SECONDS
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    teacherId: payload.teacherId ?? null,
    guardianId: payload.guardianId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    const role = payload.role as UserRole | undefined;
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;

    if (!userId || !role || !VALID_ROLES.includes(role) || !email || !name) {
      return null;
    }

    return {
      userId,
      email,
      name,
      role,
      teacherId: (payload.teacherId as string | null | undefined) ?? null,
      guardianId: (payload.guardianId as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function hasRole(
  userRole: UserRole,
  allowedRoles: readonly UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

export function isAdminOrStaff(role: UserRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

export function isTeacher(role: UserRole): boolean {
  return role === "TEACHER";
}

export function isGuardian(role: UserRole): boolean {
  return role === "GUARDIAN";
}

export function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
    case "STAFF":
      return "/admin";
    case "TEACHER":
      return "/docente";
    case "GUARDIAN":
      return "/portal";
  }
}

export const ROLE_ROUTE_RULES: Array<{
  prefix: string;
  allowedRoles: readonly UserRole[];
}> = [
  { prefix: "/admin", allowedRoles: ["ADMIN", "STAFF"] },
  { prefix: "/docente", allowedRoles: ["TEACHER"] },
  { prefix: "/portal", allowedRoles: ["GUARDIAN"] },
];

export function getAllowedRolesForPath(
  pathname: string
): readonly UserRole[] | null {
  for (const rule of ROLE_ROUTE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.allowedRoles;
    }
  }
  return null;
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const allowed = getAllowedRolesForPath(pathname);
  if (!allowed) return true;
  return allowed.includes(role);
}
