"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, clearTokens } from "./api";

type State<T> = { data: T | null; error: string };

// Charge une route de l'API, et la recharge toutes les `refreshMs` millisecondes (0 = jamais).
// `reload()` force un rechargement immédiat (après une action de l'utilisateur).
// Un 401 (session expirée) renvoie vers la page de connexion.
export function useApi<T>(path: string | null, refreshMs = 0): State<T> & { reload: () => void } {
  const router = useRouter();
  const [state, setState] = useState<State<T>>({ data: null, error: "" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // path = null : requête désactivée (ex. données réservées à un autre rôle)
    if (path === null) return;
    let cancelled = false;
    const run = () =>
      api<T>(path)
        .then((data) => {
          if (!cancelled) setState({ data, error: "" });
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 401) {
            clearTokens();
            router.replace("/login");
          } else {
            setState((s) => ({ ...s, error: "Impossible de charger les données." }));
          }
        });
    run();
    const timer = refreshMs ? setInterval(run, refreshMs) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [path, refreshMs, router, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
