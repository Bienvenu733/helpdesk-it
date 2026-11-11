"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

/* ------------------------------------------------------------------------------------------
   Briques d'interface partagées. Toutes les couleurs viennent des variables de globals.css.
   ------------------------------------------------------------------------------------------ */

export type Tone = "primary" | "info" | "success" | "warning" | "danger" | "violet" | "neutral";

const TONE_SOFT: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-strong",
  info: "bg-info-soft text-info-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  violet: "bg-violet-soft text-violet-ink",
  neutral: "bg-surface-2 text-ink-2 border border-line-strong",
};

/** Teinte de l'icône des cartes de statistiques. */
const TONE_ICON: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-strong",
  info: "bg-info-soft text-info-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  violet: "bg-violet-soft text-violet-ink",
  neutral: "bg-surface-2 text-ink-2",
};

export function Card({
  title,
  action,
  children,
  className = "",
  bodyClassName = "p-5",
  ...rest
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
} & Omit<ComponentProps<"section">, "title">) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-line bg-surface shadow-(--shadow-card) ${className}`}
      {...rest}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  alert = false,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string | number;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-(--shadow-card)">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-2">{label}</p>
        <p
          className={`text-2xl font-semibold tabular-nums leading-tight ${alert ? "text-danger-ink" : "text-ink"}`}
        >
          {value}
        </p>
        {hint && <p className="truncate text-xs text-ink-2">{hint}</p>}
      </div>
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_SOFT[tone]}`}
    >
      {children}
    </span>
  );
}

/* ---- Boutons : une seule définition de style, utilisable sur <button> ET <Link> ---- */

export type ButtonVariant = "primary" | "secondary" | "success" | "ghost";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary-fill text-white hover:bg-primary-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  success: "bg-success-ink text-white hover:opacity-90",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
};

export function btn(variant: ButtonVariant = "primary") {
  return `${BTN_BASE} ${BTN_VARIANT[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return <button className={`${btn(variant)} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  className = "",
  ...props
}: { variant?: ButtonVariant } & ComponentProps<typeof Link>) {
  return <Link className={`${btn(variant)} ${className}`} {...props} />;
}

/* ---- Champs de formulaire ---- */

export const field =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

/* ---- Tableaux ---- */

export const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-2";
export const td = "px-4 py-3 text-sm text-ink";
export const tableWrap = "overflow-x-auto";
export const tableHead = "border-b border-line-strong bg-surface-2";
export const tableRow = "border-b border-line last:border-0 hover:bg-surface-2/60";

/* ---- Avatar : initiales sur une couleur stable (même personne = même couleur) ---- */

const AVATAR_TONES = [
  "bg-primary-soft text-primary-strong",
  "bg-violet-soft text-violet-ink",
  "bg-success-soft text-success-ink",
  "bg-warning-soft text-warning-ink",
  "bg-info-soft text-info-ink",
];

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function Avatar({
  name,
  size = "md",
  ring = false,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const sizes = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-11 text-sm" };
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase ${sizes[size]} ${
        AVATAR_TONES[hash(name) % AVATAR_TONES.length]
      } ${ring ? "ring-2 ring-surface" : ""}`}
    >
      {name.slice(0, 2)}
    </span>
  );
}

/* ---- Onglets segmentés (ex. 7 jours / 14 jours) ---- */

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === o.value ? "bg-surface text-ink shadow-(--shadow-card)" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Interrupteur (mode sombre) ---- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary-fill" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-2">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-2">
        <Icon className="size-5" aria-hidden />
      </span>
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-ink">
      {children}
    </p>
  );
}

/** Apparition en fondu avec léger glissement ; `delay` décale les blocs pour les faire entrer à la suite. */
export function Reveal({
  delay = 0.15,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`anim-fade-up ${className}`} style={{ "--delay": `${delay}s` } as CSSProperties}>
      {children}
    </div>
  );
}
