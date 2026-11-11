"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, homeFor, login, Me, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(username, email, password);
      }
      await login(username, password);
      const me = await api<Me>("/auth/me/");
      router.push(homeFor(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-4">
      <h1 className="mb-1 text-2xl font-semibold">HelpDesk IT</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {mode === "login" ? "Connectez-vous" : "Créez un compte"}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className={input}
          placeholder="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {mode === "register" && (
          <input
            className={input}
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <input
          className={input}
          type="password"
          placeholder="Mot de passe (8 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "…" : mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>
      <button
        className="mt-4 text-sm text-blue-600 underline"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login"
          ? "Pas de compte ? S'inscrire"
          : "Déjà un compte ? Se connecter"}
      </button>
    </main>
  );
}
