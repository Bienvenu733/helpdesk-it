"use client";

import { Bell, Gauge, Headset, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, field } from "@/components/ui";
import { api, homeFor, login, Me, register } from "@/lib/api";

const POINTS = [
  { icon: Zap, title: "Répartition automatique", text: "Chaque incident est confié au premier technicien libre." },
  { icon: Gauge, title: "Délais maîtrisés", text: "Un délai de résolution selon la priorité, et les retards sont signalés." },
  { icon: Bell, title: "Toujours informé", text: "Notifications à chaque prise en charge, message ou résolution." },
];

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

  const label = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de présentation */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#4f46e5] via-[#5c5fef] to-[#8b5cf6] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/20">
            <Headset className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">HelpDesk IT</span>
        </div>

        <div>
          <h2 className="max-w-md text-4xl leading-tight font-semibold">
            Vos incidents informatiques, traités sans friction.
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <p.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-white/80">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/70">Django · Spring Boot · PostgreSQL · Oracle · Next.js</p>

        {/* Décor */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5" />
      </aside>

      {/* Formulaire */}
      <main className="flex items-center justify-center bg-bg px-6 py-12">
        <div className="anim-fade-up w-full max-w-sm" style={{ "--delay": "0.1s" } as React.CSSProperties}>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-fill text-white">
              <Headset className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold text-ink">HelpDesk IT</span>
          </div>

          <h1 className="text-2xl font-semibold text-ink">
            {mode === "login" ? "Bon retour parmi nous" : "Créer un compte"}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {mode === "login" ? "Connectez-vous pour suivre vos tickets." : "Quelques secondes suffisent."}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-(--shadow-card)"
          >
            <div>
              <label htmlFor="username" className={label}>
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                className={field}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {mode === "register" && (
              <div>
                <label htmlFor="email" className={label}>
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  className={field}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="password" className={label}>
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                className={field}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "register" ? "8 caractères minimum" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Patientez…" : mode === "login" ? "Se connecter" : "S'inscrire"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-2">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="font-medium text-primary-strong hover:underline"
            >
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
