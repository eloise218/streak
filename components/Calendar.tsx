"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  fromISODate,
  MONTH_LABELS_FR,
  startOfMonth,
  toISODate,
  todayISO,
  WEEKDAY_LABELS_FR,
} from "@/lib/date";
import type { Weekday } from "@/lib/types";

type DayScore = { total: number; pct: number };

type Props = {
  selected: string;
  onSelect: (iso: string) => void;
  getScore: (iso: string) => DayScore;
};

export default function Calendar({ selected, onSelect, getScore }: Props) {
  const [cursor, setCursor] = useState<Date>(() =>
    startOfMonth(fromISODate(selected)),
  );

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const sundayIndex = first.getDay();
    const mondayFirstOffset = (sundayIndex + 6) % 7;
    const daysInMonth = last.getDate();

    const cells: { iso: string; inMonth: boolean }[] = [];

    for (let i = mondayFirstOffset; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      cells.push({ iso: toISODate(d), inMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
      cells.push({ iso: toISODate(d), inMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const lastIso = cells[cells.length - 1].iso;
      const d = fromISODate(lastIso);
      d.setDate(d.getDate() + 1);
      cells.push({ iso: toISODate(d), inMonth: false });
    }

    return cells;
  }, [cursor]);

  const today = todayISO();

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-900/60 p-4 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <div className="text-sm font-semibold capitalize text-white">
          {MONTH_LABELS_FR[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Mois suivant"
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d}>{WEEKDAY_LABELS_FR[d as Weekday]}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((cell) => {
          const isSelected = cell.iso === selected;
          const isToday = cell.iso === today;
          const isPastOrToday = cell.iso <= today;
          const day = fromISODate(cell.iso).getDate();
          const score = isPastOrToday ? getScore(cell.iso) : null;

          const tone = scoreTone(score);

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect(cell.iso)}
              className={[
                "relative flex aspect-square items-center justify-center rounded-full text-sm transition",
                cell.inMonth ? "" : "opacity-30",
                isSelected
                  ? "bg-white text-black font-semibold shadow-lg ring-2 ring-white"
                  : tone.bg + " " + tone.text + " hover:scale-105",
                isToday && !isSelected ? "ring-1 ring-white/40" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const t = todayISO();
            setCursor(startOfMonth(fromISODate(t)));
            onSelect(t);
          }}
          className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          Aujourd&apos;hui
        </button>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-rose-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-500/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
      </div>
    </div>
  );
}

function scoreTone(score: DayScore | null): { bg: string; text: string } {
  if (!score || score.total === 0) {
    return { bg: "bg-white/5 hover:bg-white/10", text: "text-zinc-300" };
  }
  if (score.pct >= 80) {
    return {
      bg: "bg-emerald-500/25 hover:bg-emerald-500/40",
      text: "text-emerald-100",
    };
  }
  if (score.pct >= 50) {
    return {
      bg: "bg-amber-500/25 hover:bg-amber-500/40",
      text: "text-amber-100",
    };
  }
  return {
    bg: "bg-rose-500/25 hover:bg-rose-500/40",
    text: "text-rose-100",
  };
}
