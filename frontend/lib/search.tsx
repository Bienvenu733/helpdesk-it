"use client";

import { createContext, useContext, useState } from "react";

type SearchState = { query: string; setQuery: (q: string) => void };

const SearchContext = createContext<SearchState>({ query: "", setQuery: () => {} });

/** La recherche de la barre du haut filtre en direct les listes de tickets affichées. */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  return useContext(SearchContext);
}

/** Un ticket correspond-il à la recherche ? (titre, numéro, catégorie, personnes) */
export function matchesQuery(
  query: string,
  fields: (string | number | null | undefined)[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}
