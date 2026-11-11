"use client";

import { useEffect, useRef, useState } from "react";
import { shortDate } from "@/lib/format";

// Graphiques en SVG/HTML sans dépendance. Les couleurs sont des variables CSS (globals.css) :
// le mode sombre s'applique tout seul.

/* ============================================================================================
   Barres horizontales classées : une teinte, longueur = quantité
   ============================================================================================ */

type Row = { key: string; label: string; count: number };

export function BarList({ rows, sort = false }: { rows: Row[]; sort?: boolean }) {
  const data = sort ? [...rows].sort((a, b) => b.count - a.count) : rows;
  const max = Math.max(1, ...data.map((r) => r.count));
  const total = data.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {data.map((r) => (
          <li
            key={r.key}
            title={`${r.label} : ${r.count} ticket(s)${total ? ` (${Math.round((r.count / total) * 100)} %)` : ""}`}
            className="group grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm"
          >
            <span className="text-ink-2">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full transition-opacity group-hover:opacity-75"
                style={{ width: `${(r.count / max) * 100}%`, background: "var(--primary)" }}
              />
            </span>
            <span className="text-right font-medium tabular-nums text-ink">{r.count}</span>
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>Répartition</caption>
        <tbody>
          {data.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              <td>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================================
   Barres groupées par jour : deux séries (gris + indigo), infobulle au survol
   ============================================================================================ */

type Point = { date: string; created: number; resolved: number };

const H = 250;
const PAD = { top: 12, right: 8, bottom: 28, left: 30 };

/** Rectangle dont seul le haut est arrondi (la base repose à plat sur l'axe). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function GroupedBarChart({
  points,
  labels = ["Créés", "Résolus"],
}: {
  points: Point[];
  labels?: [string, string];
}) {
  const [hover, setHover] = useState<number | null>(null);

  // On mesure la largeur disponible : le dessin la remplit sans agrandir les textes.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(300, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxRaw = Math.max(1, ...points.flatMap((p) => [p.created, p.resolved]));
  const step = maxRaw <= 4 ? 1 : maxRaw <= 10 ? 2 : maxRaw <= 20 ? 5 : 10;
  const yMax = Math.ceil(maxRaw / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const groupW = innerW / Math.max(1, points.length);
  const barW = Math.max(4, Math.min(16, groupW * 0.3));
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const cx = (i: number) => PAD.left + groupW * (i + 0.5);

  // Sur une carte étroite, on n'affiche qu'une date sur trois pour qu'elles ne se chevauchent pas.
  const labelEvery = W < 420 ? 3 : points.length > 8 ? 2 : 1;
  const hp = hover === null ? null : points[hover];

  return (
    <div>
      <div className="mb-3 flex gap-5 text-xs text-ink-2">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: "var(--bar-gray)" }} />
          {labels[0]}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: "var(--primary)" }} />
          {labels[1]}
        </span>
      </div>

      <div className="relative" ref={box}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block"
          role="img"
          aria-label={`${labels[0]} et ${labels[1]} par jour`}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--line-strong)"
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : "3 4"}
              />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
                {t}
              </text>
            </g>
          ))}

          {hover !== null && (
            <rect
              x={cx(hover) - groupW / 2 + 2}
              y={PAD.top}
              width={groupW - 4}
              height={innerH}
              rx={8}
              fill="var(--surface-2)"
            />
          )}

          {points.map((p, i) => (
            <g key={p.date}>
              {/* Écart de 3 px entre les deux barres d'un même jour */}
              <path d={topRounded(cx(i) - barW - 1.5, y(p.created), barW, PAD.top + innerH - y(p.created), 4)} fill="var(--bar-gray)" />
              <path d={topRounded(cx(i) + 1.5, y(p.resolved), barW, PAD.top + innerH - y(p.resolved), 4)} fill="var(--primary)" />
              {i % labelEvery === 0 && (
                <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
                  {shortDate(p.date + "T00:00:00")}
                </text>
              )}
            </g>
          ))}

          {/* Zones de survol : une colonne par jour, bien plus large que les barres */}
          {points.map((p, i) => (
            <rect
              key={p.date}
              x={cx(i) - groupW / 2}
              y={PAD.top}
              width={groupW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-(--shadow-pop)"
            style={{
              left: `${(cx(hover) / W) * 100}%`,
              transform: hover > points.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <p className="mb-1 font-semibold text-ink">{shortDate(hp.date + "T00:00:00")}</p>
            <p className="flex items-center gap-2 text-ink-2">
              <span className="size-2 rounded-full" style={{ background: "var(--bar-gray)" }} />
              {labels[0]} : <b className="text-ink">{hp.created}</b>
            </p>
            <p className="flex items-center gap-2 text-ink-2">
              <span className="size-2 rounded-full" style={{ background: "var(--primary)" }} />
              {labels[1]} : <b className="text-ink">{hp.resolved}</b>
            </p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Tickets par jour</caption>
        <thead>
          <tr>
            <th>Jour</th>
            <th>{labels[0]}</th>
            <th>{labels[1]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{shortDate(p.date + "T00:00:00")}</th>
              <td>{p.created}</td>
              <td>{p.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================================
   Donut : répartition d'un total, avec légende en pourcentages
   ============================================================================================ */

type Slice = { key: string; label: string; count: number; color: string };

const R = 70;
const STROKE = 24;
const C = 2 * Math.PI * R;
const GAP = 3; // espace entre deux segments

export function DonutChart({
  rows,
  centerLabel,
}: {
  rows: Slice[];
  centerLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const visible = rows.filter((r) => r.count > 0);

  // Longueur de chaque segment ; le début d'un segment = somme des longueurs précédentes.
  const lengths = visible.map((r) => (r.count / total) * C);
  const arcs = visible.map((r, i) => ({
    ...r,
    dash: Math.max(0.5, lengths[i] - (visible.length > 1 ? GAP : 0)),
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  const active = hover === null ? null : visible[hover];

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg viewBox="0 0 180 180" className="size-44" role="img" aria-label={`Répartition : ${centerLabel}`}>
          <circle cx={90} cy={90} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          <g transform="rotate(-90 90 90)">
            {arcs.map((a, i) => (
              <circle
                key={a.key}
                cx={90}
                cy={90}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={hover === i ? STROKE + 4 : STROKE}
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                strokeDashoffset={-a.offset}
                opacity={hover === null || hover === i ? 1 : 0.35}
                style={{ transition: "opacity .15s, stroke-width .15s" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-ink">{active ? active.count : total}</span>
          <span className="max-w-24 text-xs leading-tight text-ink-2">{active ? active.label : centerLabel}</span>
        </div>
      </div>

      <ul className="grid w-full flex-1 gap-2.5">
        {rows.map((r) => {
          const idx = visible.findIndex((v) => v.key === r.key);
          return (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 text-sm"
              onMouseEnter={() => idx >= 0 && setHover(idx)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="flex items-center gap-2.5 text-ink-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                {r.label}
              </span>
              <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-ink">
                {total ? Math.round((r.count / total) * 100) : 0} %
                <span className="ml-2 text-xs font-normal text-ink-2">({r.count})</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
