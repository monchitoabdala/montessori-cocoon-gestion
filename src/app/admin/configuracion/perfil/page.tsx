"use client";

import { Avatar } from "@/components/school/Avatar";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

interface ProfileUser {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl?: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    roleTitle: string;
    department: string;
  } | null;
  teacher?: {
    phone?: string | null;
  } | null;
  guardian?: {
    phone?: string | null;
    photoUrl?: string | null;
  } | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Dirección",
  STAFF: "Secretaría / Tesorería",
  TEACHER: "Guía Montessori",
  GUARDIAN: "Familia / Tutor",
};

export default function AdminConfigPerfilPage() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Card 1: Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Card 2: Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo cargar el perfil");
      }
      const u: ProfileUser = json.user;
      setUser(u);
      setName(u.name ?? "");
      setEmail(u.email ?? "");
      setPhone(
        u.employee?.phone ?? u.teacher?.phone ?? u.guardian?.phone ?? "",
      );
      setPhotoUrl(
        u.photoUrl ?? u.employee?.photoUrl ?? u.guardian?.photoUrl ?? "",
      );
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Error al cargar el perfil",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  function handleRandomAvatar() {
    const randomSeed = `${name.trim().replace(/\s+/g, "") || "Cocoon"}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    setPhotoUrl(
      `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(randomSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
    );
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          photoUrl: photoUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudieron guardar los cambios");
      }
      setUser(json.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      window.dispatchEvent(new Event("cocoon-profile-updated"));
      router.refresh();
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Error al guardar el perfil",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmación de contraseña no coincide.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar la contraseña");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback("Contraseña actualizada correctamente.");
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Error al actualizar la contraseña",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Cargando perfil de usuario...
      </div>
    );
  }

  const roleBadge = user ? (ROLE_LABELS[user.role] ?? user.role) : "Usuario";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={photoUrl || null} name={name || "Usuario"} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  Datos Personales y Avatar
                </h2>
                <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {roleBadge}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {user?.employee
                  ? `${user.employee.roleTitle} · ${user.employee.department}`
                  : email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRandomAvatar}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg
              className="size-3.5 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Generar avatar aleatorio
          </button>
        </div>

        {profileError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {profileError}
          </div>
        ) : null}

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre completo
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email de acceso
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Teléfono
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 341..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                URL de avatar
              </label>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {profileSaved ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <svg
                  className="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Cambios guardados
              </span>
            ) : null}

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {savingProfile ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Seguridad y Contraseña
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Actualizá tu contraseña de ingreso al sistema.
          </p>
        </div>

        {passwordError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {passwordError}
          </div>
        ) : null}

        {passwordFeedback ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
            {passwordFeedback}
          </div>
        ) : null}

        <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Contraseña actual
              </label>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nueva contraseña
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Confirmar nueva contraseña
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
