"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  ADMIN: "/admin",
  STAFF: "/admin",
  TEACHER: "/docente",
  GUARDIAN: "/portal",
};

interface DemoAccount {
  roleLabel: string;
  email: string;
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleLabel: "Dirección (Admin)",
    email: "admin@montessoricocoon.edu.ar",
    password: "Admin123!",
  },
  {
    roleLabel: "Secretaría (Staff)",
    email: "secretaria@montessoricocoon.edu.ar",
    password: "Staff123!",
  },
  {
    roleLabel: "Guía Montessori (Docente)",
    email: "guia.garcia@montessoricocoon.edu.ar",
    password: "Docente123!",
  },
  {
    roleLabel: "Familia (Tutor)",
    email: "familia.rodriguez@gmail.com",
    password: "Familia123!",
  },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
        user?: { role?: UserRole };
      };

      if (!response.ok) {
        setError(data.error ?? "Credenciales inválidas. Verificá tu correo y contraseña.");
        setLoading(false);
        return;
      }

      const target =
        data.redirectTo ??
        (data.user?.role ? ROLE_REDIRECT_MAP[data.user.role] : "/");

      router.push(target);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intentá nuevamente.");
      setLoading(false);
    }
  };

  const fillDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <img
            src="/images/logo-cocoon.png"
            alt="Escuela Montessori Cocoon"
            className="mx-auto mb-4 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Escuela Montessori Cocoon
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Funes, Santa Fe · Sistema de Gestión Escolar
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nombre@colegio.edu.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>

        {/* Demo Accounts Helper */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cuentas de prueba
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Clic para completar
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="flex w-full items-center justify-between py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {account.roleLabel}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {account.email}
                  </p>
                </div>
                <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {account.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
