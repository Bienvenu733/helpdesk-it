"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const EVENT = "themechange";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // stockage indisponible (navigation privée) : le thème vaut pour cette page seulement
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Thème actif. Le serveur ne le connaît pas : il rend « light », le navigateur corrige. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}
