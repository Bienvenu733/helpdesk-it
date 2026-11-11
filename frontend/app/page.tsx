"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, hasToken, homeFor, Me } from "@/lib/api";

// Page d'accueil : aiguillage vers l'espace du rôle, ou vers la connexion.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    api<Me>("/auth/me/")
      .then((me) => router.replace(homeFor(me.role)))
      .catch(() => router.replace("/login"));
  }, [router]);
  return null;
}
