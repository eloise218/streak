"use client";

import { useEffect, useRef, useState } from "react";
import {
  describeRecurrence,
  insertHabit,
  loadHabits,
  newId,
  softDeleteHabit,
} from "@/lib/storage";
import type { Habit, Recurrence, Weekday } from "@/lib/types";
import SignOutButton from "@/components/SignOutButton";

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

export default function HabitsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<"daily" | "weekdays">("daily");
  const [days, setDays] = useState<Weekday[]>([]);
  const [target, setTarget] = useState(1);
  const [enterIds, setEnterIds] = useState<Set<string>>(() => new Set());
  const [popAdd, setPopAdd] = useState(false);
  const enterTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = enterTimersRef.current;
    return () => {
      for (const id of timers.values()) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const h = await loadHabits();
        setHabits(h);
      } catch (e) {
        console.error("Échec du chargement des habitudes :", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  function addHabit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "weekdays" && days.length === 0) return;

    const recurrence: Recurrence =
      mode === "daily" ? { kind: "daily" } : { kind: "weekdays", days };

    const habit: Habit = {
      id: newId(),
      name: trimmed,
      recurrence,
      createdAt: new Date().toISOString(),
      target: target > 1 ? target : undefined,
    };
    setHabits([...habits, habit]);
    insertHabit(habit).catch((e) => console.error("insert habit:", e));
    setEnterIds((s) => new Set(s).add(habit.id));
    const enteringId = habit.id;
    const timer = window.setTimeout(() => {
      enterTimersRef.current.delete(enteringId);
      setEnterIds((s) => {
        const next = new Set(s);
        next.delete(enteringId);
        return next;
      });
    }, 450);
    enterTimersRef.current.set(enteringId, timer);
    setPopAdd(true);
    setName("");
    setMode("daily");
    setDays([]);
    setTarget(1);
  }

  function toggleDay(d: Weekday) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function deleteHabit(id: string) {
    const now = new Date().toISOString();
    setHabits(habits.map((h) => (h.id === id ? { ...h, deletedAt: now } : h)));
    softDeleteHabit(id).catch((e) => console.error("delete habit:", e));
  }

  const visibleHabits = habits.filter((h) => !h.deletedAt);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6 text-sm text-zinc-500">
        Chargement…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Mes habitudes
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Définis tes habitudes et leur récurrence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 backdrop-blur transition hover:bg-white/10"
          >
            ← Retour
          </a>
          <SignOutButton />
        </div>
      </header>

      <form
        onSubmit={addHabit}
        className="mb-10 space-y-5 rounded-3xl border border-white/5 bg-zinc-900/60 p-5 shadow-xl backdrop-blur"
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Nom de l&apos;habitude
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Boire de l'eau"
            className="w-full rounded-2xl border border-white/5 bg-black/40 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-indigo-500/60"
          />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Récurrence
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={[
                "rounded-full px-4 py-2 text-sm transition",
                mode === "daily"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10",
              ].join(" ")}
            >
              Tous les jours
            </button>
            <button
              type="button"
              onClick={() => setMode("weekdays")}
              className={[
                "rounded-full px-4 py-2 text-sm transition",
                mode === "weekdays"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10",
              ].join(" ")}
            >
              Jours spécifiques
            </button>
          </div>

          {mode === "weekdays" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAYS.map(({ value, label }) => {
                const active = days.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={[
                      "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                      active
                        ? "bg-indigo-500 text-white"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Combien de fois par jour ?
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTarget((t) => Math.max(1, t - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/5 bg-black/40 text-lg text-zinc-300 transition hover:border-indigo-500/60 hover:text-white"
              aria-label="Diminuer"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={target}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setTarget(Number.isFinite(n) && n >= 1 ? Math.min(99, n) : 1);
              }}
              className="w-16 rounded-2xl border border-white/5 bg-black/40 px-3 py-2 text-center text-sm text-zinc-100 outline-none transition focus:border-indigo-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setTarget((t) => Math.min(99, t + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/5 bg-black/40 text-lg text-zinc-300 transition hover:border-indigo-500/60 hover:text-white"
              aria-label="Augmenter"
            >
              +
            </button>
            <span className="text-xs text-zinc-500">
              {target === 1 ? "1 fois" : `${target} fois`}
            </span>
          </div>
        </div>

        <button
          type="submit"
          onAnimationEnd={() => setPopAdd(false)}
          className={[
            "rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
            popAdd ? "btn-pop" : "",
          ].join(" ")}
          disabled={
            !name.trim() || (mode === "weekdays" && days.length === 0)
          }
        >
          Ajouter l&apos;habitude
        </button>
      </form>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Liste ({visibleHabits.length})
      </h2>

      {visibleHabits.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 text-center text-sm text-zinc-500">
          Aucune habitude pour l&apos;instant.
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleHabits.map((h) => (
            <li
              key={h.id}
              className={[
                "flex items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-4 transition hover:border-white/10",
                enterIds.has(h.id) ? "item-enter" : "",
              ].join(" ")}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-100">{h.name}</span>
                  {h.target && h.target > 1 && (
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                      ×{h.target}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {describeRecurrence(h.recurrence)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteHabit(h.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                aria-label={`Supprimer ${h.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
