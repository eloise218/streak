"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

type Props = {
  mode: "signin" | "signup";
  action: Action;
};

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  const submitLabel =
    mode === "signin"
      ? pending
        ? "Connexion…"
        : "Se connecter"
      : pending
        ? "Création…"
        : "Créer le compte";

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 outline-none transition focus:border-white/20 focus:bg-white/10"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-400">Mot de passe</span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete={
            mode === "signin" ? "current-password" : "new-password"
          }
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-100 outline-none transition focus:border-white/20 focus:bg-white/10"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/20 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
