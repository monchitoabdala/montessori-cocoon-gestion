import { AppShell } from "@/components/school/AppShell";
import {
  getDefaultRedirectForRole,
  getSessionFromCookies,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import type React from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "ADMIN" && session.role !== "STAFF") {
    redirect(getDefaultRedirectForRole(session.role));
  }

  return <AppShell user={session}>{children}</AppShell>;
}
