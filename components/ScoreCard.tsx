"use client";

import { useState } from "react";

type Score = { done: number; total: number };
type Mode = "day" | "week" | "month";

type Props = {
  day: Score;
  week: Score;
  month: Score;
};

const TABS: { key: Mode; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
];

export default function ScoreCard({ day, week, month }: Props) {
  const [mode, setMode] = useState<Mode>("day");
  const current = mode === "day" ? day : mode === "week" ? week : month;
  const { done, total } = current;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const gradient =
    total === 0
      ? "from-zinc-700 to-zinc-800"
      : pct >= 80
        ? "from-emerald-500 to-teal-500"
        : pct >= 50
          ? "from-amber-500 to-orange-500"
          : "from-rose-500 to-pink-500";

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${gradient} p-4 shadow-lg`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition",
                mode === t.key
                  ? "bg-white/25 text-white"
                  : "text-white/60 hover:text-white/90",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-white/80">
          {done} / {total}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-3xl font-bold leading-none text-white drop-shadow-sm">
          {pct}%
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/20">
          <div
            className="h-full bg-white/90 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
