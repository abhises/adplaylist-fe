"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export type LineSeries = {
  key: string;
  label: string;
  // A CSS colour, e.g. "var(--viz-1)". Series keep their colour whatever
  // else is shown.
  color: string;
};

type Point = { date: string } & Record<string, number | string>;

const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };
// Room for the line-end labels when there's more than one series.
const END_LABEL_WIDTH = 72;

// Round step for the y axis: 1, 2 or 5 × a power of ten.
function niceStep(max: number, ticks: number) {
  const raw = max / ticks;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// A daily line chart: thin lines, a recessive grid, and a crosshair whose
// tooltip lists every series on the hovered day. With two or more series it
// shows a legend and labels each line at its end.
export default function LineChart({
  data,
  series,
  format,
  label,
}: {
  data: Point[];
  series: LineSeries[];
  format: (value: number) => string;
  // Describes the chart for screen readers.
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const multi = series.length > 1;
  const right = PAD.right + (multi ? END_LABEL_WIDTH : 0);
  const plotW = Math.max(0, width - PAD.left - right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  const step = niceStep(Math.max(1, ...values), 4);
  const yMax = Math.max(step, Math.ceil(Math.max(1, ...values) / step) * step);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const x = (i: number) => PAD.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  // About six date labels, always including the last day.
  const every = Math.max(1, Math.ceil(data.length / 6));
  const xTicks = data
    .map((_, i) => i)
    .filter((i) => (data.length - 1 - i) % every === 0);

  function onMove(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left) / box.width;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
  }

  const hovered = hover !== null ? data[hover] : null;
  const last = data.length - 1;

  // Line-end labels, nudged apart (at least 13px) where lines end close
  // together.
  const endLabels = series
    .map((s) => ({ s, y: data.length ? y(Number(data[last]![s.key]) || 0) : 0 }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    endLabels[i]!.y = Math.max(endLabels[i]!.y, endLabels[i - 1]!.y + 13);
  }
  const overflow = endLabels.length ? endLabels[endLabels.length - 1]!.y - (PAD.top + plotH) : 0;
  if (overflow > 0) endLabels.forEach((l) => (l.y -= overflow));

  return (
    <div>
      {multi && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={wrapRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && data.length > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={label} className="block overflow-visible">
            {yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="currentColor"
                  className={t === 0 ? "text-ink/30" : "text-ink/10"}
                />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"}
                className="fill-ink-muted text-[11px]"
              >
                {shortDate(data[i]!.date)}
              </text>
            ))}

            {series.map((s) => (
              <path
                key={s.key}
                d={data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(Number(d[s.key]) || 0)}`).join("")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {multi &&
              endLabels.map(({ s, y: labelY }) => (
                <text
                  key={s.key}
                  x={PAD.left + plotW + 8}
                  y={labelY}
                  dy="0.32em"
                  className="fill-ink-muted text-[11px]"
                >
                  {s.label}
                </text>
              ))}

            {hovered && hover !== null && (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="currentColor"
                  className="text-ink/40"
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(hover)}
                    cy={y(Number(hovered[s.key]) || 0)}
                    r={4}
                    fill={s.color}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[140px] border border-ink/15 bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              top: PAD.top,
              left: x(hover),
              transform: x(hover) > width / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <p className="mb-1 text-ink-muted">{shortDate(hovered.date)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <strong className="text-ink tabular-nums">{format(Number(hovered[s.key]) || 0)}</strong>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
