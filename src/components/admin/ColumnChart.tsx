"use client";

import { useState } from "react";
import { useAdminText } from "@/components/admin/AdminLang";

/*
  Single-series column chart for the admin (dataviz rules: one hue, thin bars with a rounded data end,
  hairline grid, hover/focus tooltip, a table view). Bar gold #a8853a passes the chart checks on the dark surface;
  the hovered bar lifts to the brand gold.
*/

type Column = { key: string; label: string; value: number; detail?: string };

/** How values read: whole euros or plain counts (a string, so server pages can pass it). */
type Unit = "euro" | "count";
const FORMAT: Record<Unit, (value: number, intl: string) => string> = {
  euro: (value, intl) =>
    new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value),
  count: (value, intl) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(value),
};

/** The top of the scale: the next round number at or above the largest value (1, 2, 5 or 10 × a power of ten). */
function niceMax(largest: number) {
  if (largest <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(largest));
  const step = [1, 2, 5, 10].find((candidate) => largest / magnitude <= candidate)!;
  return step * magnitude;
}

export default function ColumnChart({
  data,
  unit,
  title,
  labelEvery = 1,
  height = 180,
}: {
  data: Column[];
  unit: Unit;
  title: string;
  labelEvery?: number;
  height?: number;
}) {
  const { t } = useAdminText();
  const format = (value: number) => FORMAT[unit](value, t.intl);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = niceMax(Math.max(...data.map((column) => column.value), 0));
  const ticks = [0, max / 2, max];
  const hovered = hover === null ? null : data[hover];

  return (
    <figure className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <figcaption className="text-sm text-cream/75">{title}</figcaption>
        <button
          type="button"
          onClick={() => setTable((shown) => !shown)}
          className="text-xs text-cream/50 underline underline-offset-4 hover:text-cream"
        >
          {table ? t.chart.asChart : t.chart.asTable}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <tbody>
            {data.map((column) => (
              <tr key={column.key} className="border-b border-gold/10">
                <td className="py-1 text-cream/70">{column.label}</td>
                <td className="py-1 text-right tabular-nums text-cream">{format(column.value)}</td>
                {column.detail !== undefined && <td className="py-1 pl-4 text-right text-cream/55">{column.detail}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative pl-12" style={{ height: height + 22 }} onMouseLeave={() => setHover(null)}>
          {/* hairline grid with three ticks */}
          {ticks.map((tick) => (
            <div
              key={tick}
              className="pointer-events-none absolute left-12 right-0 border-t border-cream/10"
              style={{ top: height - (tick / max) * height }}
            >
              <span className="absolute -left-12 -translate-y-1/2 pr-2 text-[0.65rem] tabular-nums text-cream/45">
                {format(tick)}
              </span>
            </div>
          ))}
          <div className="absolute inset-x-0 left-12 top-0 flex items-end" style={{ height }}>
            {data.map((column, index) => (
              <button
                key={column.key}
                type="button"
                aria-label={`${column.label}: ${format(column.value)}${column.detail ? `, ${column.detail}` : ""}`}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full flex-1 items-end justify-center px-[2px] focus:outline-none"
              >
                <span
                  className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${hover === index ? "bg-[#c9a24a]" : "bg-[#a8853a]"} group-focus-visible:ring-2 group-focus-visible:ring-cream`}
                  style={{ height: column.value > 0 ? Math.max(2, (column.value / max) * height) : 0 }}
                />
                {(data.length - 1 - index) % labelEvery === 0 && (
                  <span className="pointer-events-none absolute -bottom-5 whitespace-nowrap text-[0.65rem] text-cream/45">
                    {column.label}
                  </span>
                )}
              </button>
            ))}
          </div>
          {hovered && hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded border border-gold/30 bg-coal px-2.5 py-1.5 text-xs shadow-lg"
              style={{
                left: `calc(3rem + (100% - 3rem) * ${(hover + 0.5) / data.length})`,
                top: Math.max(0, height - (hovered.value / max) * height - 44),
              }}
            >
              <p className="text-cream/60">{hovered.label}</p>
              <p className="font-semibold tabular-nums text-cream">
                {format(hovered.value)}
                {hovered.detail && <span className="font-normal text-cream/60"> · {hovered.detail}</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
