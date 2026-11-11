"use client";

import { useState } from "react";

// Graphiques en SVG/HTML sans dépendance. Couleurs lues dans globals.css (--viz-*),
// donc clair et sombre sont gérés au même endroit.

type Row = { key: string; label: string; count: number };

/** Barres horizontales classées : une seule teinte, longueur = quantité. */
export function BarList({ rows, sort = false }: { rows: Row[]; sort?: boolean }) {
  const data = sort ? [...rows].sort((a, b) => b.count - a.count) : rows;
  const max = Math.max(1, ...data.map((r) => r.count));
  const total = data.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {data.map((r) => (
          <li
            key={r.key}
            title={`${r.label} : ${r.count} ticket(s)${
              total ? ` (${Math.round((r.count / total) * 100)} %)` : ""
            }`}
            className="group grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm"
          >
            <span style={{ color: "var(--viz-ink-2)" }}>{r.label}</span>
            <span
              className="h-3 overflow-hidden rounded-r-sm"
              style={{ background: "var(--viz-track)" }}
            >
              <span
                className="block h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{
                  width: `${(r.count / max) * 100}%`,
                  background: "var(--viz-1)",
                }}
              />
            </span>
            <span className="text-right tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
      {/* Version tableau pour les lecteurs d'écran */}
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

type Point = { date: string; created: number; resolved: number };

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 24, left: 28 };

/** Courbes sur 14 jours : tickets créés (bleu) et résolus (orange), avec repère au survol. */
export function DailyChart({
  points,
  labels = ["Créés", "Résolus"],
}: {
  points: Point[];
  labels?: [string, string];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const maxRaw = Math.max(1, ...points.flatMap((p) => [p.created, p.resolved]));
  const step = maxRaw <= 4 ? 1 : maxRaw <= 10 ? 2 : maxRaw <= 20 ? 5 : 10;
  const yMax = Math.ceil(maxRaw / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / Math.max(1, points.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const line = (k: "created" | "resolved") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p[k])}`).join(" ");

  const day = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

  const hp = hover === null ? null : points[hover];

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs" style={{ color: "var(--viz-ink-2)" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: "var(--viz-1)" }} />
          {labels[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: "var(--viz-2)" }} />
          {labels[1]}
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${labels[0]} et ${labels[1]} par jour sur les 14 derniers jours`}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
                stroke="var(--viz-grid)" strokeWidth={1}
              />
              <text
                x={PAD.left - 6} y={y(t) + 4} textAnchor="end"
                fontSize={11} fill="var(--viz-axis)"
              >
                {t}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % 2 === 0 || i === points.length - 1 ? (
              <text
                key={p.date} x={x(i)} y={H - 6} textAnchor="middle"
                fontSize={11} fill="var(--viz-axis)"
              >
                {day(p.date)}
              </text>
            ) : null,
          )}

          {hover !== null && (
            <line
              x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH}
              stroke="var(--viz-axis)" strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          <path d={line("created")} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" />
          <path d={line("resolved")} fill="none" stroke="var(--viz-2)" strokeWidth={2} strokeLinejoin="round" />

          {hover !== null && hp && (
            <>
              <circle cx={x(hover)} cy={y(hp.created)} r={4} fill="var(--viz-1)" stroke="var(--viz-surface)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(hp.resolved)} r={4} fill="var(--viz-2)" stroke="var(--viz-surface)" strokeWidth={2} />
            </>
          )}

          {/* Zones de survol : une colonne par jour, plus large que les marques */}
          {points.map((p, i) => (
            <rect
              key={p.date}
              x={x(i) - innerW / points.length / 2}
              y={PAD.top}
              width={innerW / points.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded border px-2 py-1 text-xs shadow"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: hover > points.length / 2 ? "translateX(-105%)" : "translateX(8px)",
              background: "var(--viz-surface)",
              borderColor: "var(--viz-grid)",
            }}
          >
            <p className="font-medium">{day(hp.date)}</p>
            <p style={{ color: "var(--viz-ink-2)" }}>{labels[0]} : {hp.created}</p>
            <p style={{ color: "var(--viz-ink-2)" }}>{labels[1]} : {hp.resolved}</p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Tickets par jour</caption>
        <thead>
          <tr><th>Jour</th><th>{labels[0]}</th><th>{labels[1]}</th></tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{day(p.date)}</th>
              <td>{p.created}</td>
              <td>{p.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
