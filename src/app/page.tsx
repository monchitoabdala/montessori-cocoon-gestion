import {
  getDefaultRedirectForRole,
  getSessionFromCookies,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/signin");
  }

  redirect(getDefaultRedirectForRole(session.role));
}
