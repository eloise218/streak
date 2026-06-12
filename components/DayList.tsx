"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Completion, DayItemRef, Habit, Task } from "@/lib/types";
import {
  getHabitCount,
  getTarget,
  getTaskCount,
} from "@/lib/storage";

type Props = {
  items: DayItemRef[];
  habits: Habit[];
  tasks: Task[];
  completions: Completion[];
  date: string;
  onIncrementHabit: (habitId: string) => void;
  onIncrementTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (name: string, target?: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

function refKey(r: DayItemRef) {
  return `${r.kind}:${r.id}`;
}

export default function DayList({
  items,
  habits,
  tasks,
  completions,
  date,
  onIncrementHabit,
  onIncrementTask,
  onDeleteTask,
  onAddTask,
  onMove,
}: Props) {
  const [draft, setDraft] = useState("");
  const [draftTarget, setDraftTarget] = useState(1);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [flashKeys, setFlashKeys] = useState<Set<string>>(() => new Set());
  const [enterKeys, setEnterKeys] = useState<Set<string>>(() => new Set());
  const [popAdd, setPopAdd] = useState(false);

  const liRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dragKeyRef = useRef<string | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const virtualYRef = useRef<number>(0);
  const slotMidsRef = useRef<number[]>([]);
  const prevDoneRef = useRef<Map<string, boolean>>(new Map());
  const flashTimersRef = useRef<Map<string, number>>(new Map());
  const prevKeysRef = useRef<Set<string> | null>(null);
  const enterTimersRef = useRef<Map<string, number>>(new Map());

  function captureSlotMids() {
    const mids: number[] = [];
    for (const ref of items) {
      const el = liRefs.current.get(refKey(ref));
      if (!el) {
        mids.push(Number.POSITIVE_INFINITY);
        continue;
      }
      const r = el.getBoundingClientRect();
      mids.push(r.top + r.height / 2);
    }
    slotMidsRef.current = mids;
  }

  useEffect(() => {
    dragKeyRef.current = dragKey;
  }, [dragKey]);
  useEffect(() => {
    overIndexRef.current = overIndex;
  }, [overIndex]);

  const fromIndex = useMemo(() => {
    if (!dragKey) return -1;
    return items.findIndex((r) => refKey(r) === dragKey);
  }, [items, dragKey]);

  const displayItems = useMemo(() => {
    if (fromIndex < 0 || overIndex === null || fromIndex === overIndex) {
      return items;
    }
    const arr = items.slice();
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(overIndex, 0, moved);
    return arr;
  }, [items, fromIndex, overIndex]);

  // Completion state per item, used to detect the moment something becomes done.
  const doneByKey = useMemo(() => {
    const hb = new Map(habits.map((h) => [h.id, h]));
    const tb = new Map(tasks.map((t) => [t.id, t]));
    const m = new Map<string, boolean>();
    for (const ref of items) {
      if (ref.kind === "habit") {
        const h = hb.get(ref.id);
        if (!h) continue;
        const target = getTarget(h);
        const count = getHabitCount(completions, h.id, date);
        m.set(refKey(ref), Math.min(count, target) >= target);
      } else {
        const t = tb.get(ref.id);
        if (!t) continue;
        const target = getTarget(t);
        const count = getTaskCount(t);
        m.set(refKey(ref), Math.min(count, target) >= target);
      }
    }
    return m;
  }, [items, habits, tasks, completions, date]);

  // Reset the baseline when switching days so we don't flash items that merely
  // happen to be done on another date.
  useEffect(() => {
    prevDoneRef.current = new Map(doneByKey);
    prevKeysRef.current = new Set(items.map(refKey));
    setFlashKeys(new Set());
    setEnterKeys(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Animate items that are newly added to the list (not present last render).
  useEffect(() => {
    const prev = prevKeysRef.current;
    const currentKeys = items.map(refKey);
    prevKeysRef.current = new Set(currentKeys);
    if (prev === null) return;
    const added = currentKeys.filter((k) => !prev.has(k));
    if (added.length === 0) return;

    setEnterKeys((s) => {
      const next = new Set(s);
      for (const k of added) next.add(k);
      return next;
    });

    for (const k of added) {
      const existing = enterTimersRef.current.get(k);
      if (existing) window.clearTimeout(existing);
      const id = window.setTimeout(() => {
        enterTimersRef.current.delete(k);
        setEnterKeys((s) => {
          const next = new Set(s);
          next.delete(k);
          return next;
        });
      }, 450);
      enterTimersRef.current.set(k, id);
    }
  }, [items]);

  // Briefly highlight an item the instant it becomes complete, so the eye can
  // follow it as it jumps to the bottom of the list.
  useEffect(() => {
    const prev = prevDoneRef.current;
    const newlyDone: string[] = [];
    for (const [key, done] of doneByKey) {
      if (done && prev.get(key) === false) newlyDone.push(key);
    }
    prevDoneRef.current = new Map(doneByKey);
    if (newlyDone.length === 0) return;

    setFlashKeys((s) => {
      const next = new Set(s);
      for (const k of newlyDone) next.add(k);
      return next;
    });

    for (const k of newlyDone) {
      const existing = flashTimersRef.current.get(k);
      if (existing) window.clearTimeout(existing);
      const id = window.setTimeout(() => {
        flashTimersRef.current.delete(k);
        setFlashKeys((s) => {
          const next = new Set(s);
          next.delete(k);
          return next;
        });
      }, 700);
      flashTimersRef.current.set(k, id);
    }
  }, [doneByKey]);

  useEffect(() => {
    const flashTimers = flashTimersRef.current;
    const enterTimers = enterTimersRef.current;
    return () => {
      for (const id of flashTimers.values()) window.clearTimeout(id);
      for (const id of enterTimers.values()) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (dragKey === null) return;

    function updateOverIndex(y: number) {
      const mids = slotMidsRef.current;
      if (mids.length === 0) return;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < mids.length; i++) {
        const d = Math.abs(y - mids[i]);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best !== overIndexRef.current) {
        overIndexRef.current = best;
        setOverIndex(best);
      }
    }

    function handleMove(e: PointerEvent) {
      e.preventDefault();
      virtualYRef.current = e.clientY;
      updateOverIndex(e.clientY);
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const next = Math.max(
        0,
        Math.min(window.innerHeight, virtualYRef.current + e.deltaY),
      );
      virtualYRef.current = next;
      updateOverIndex(next);
    }

    function finish(commit: boolean) {
      const key = dragKeyRef.current;
      const to = overIndexRef.current;
      if (commit && key !== null && to !== null) {
        const from = items.findIndex((r) => refKey(r) === key);
        if (from >= 0 && from !== to) onMove(from, to);
      }
      setDragKey(null);
      setOverIndex(null);
    }

    const handleUp = () => finish(true);
    const handleCancel = () => finish(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };

    document.addEventListener("pointermove", handleMove, { passive: false });
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleCancel);
    document.addEventListener("keydown", handleKey);

    const prevUserSelect = document.body.style.userSelect;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.userSelect = "none";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleCancel);
      document.removeEventListener("keydown", handleKey);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [dragKey, items, onMove]);

  function handleHandlePointerDown(
    key: string,
    index: number,
    e: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    virtualYRef.current = e.clientY;
    captureSlotMids();
    setDragKey(key);
    setOverIndex(index);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onAddTask(name, draftTarget);
    setDraft("");
    setDraftTarget(1);
    setPopAdd(true);
  }

  function setLiRef(key: string, el: HTMLLIElement | null) {
    if (el) liRefs.current.set(key, el);
    else liRefs.current.delete(key);
  }

  const habitById = new Map(habits.map((h) => [h.id, h]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const isDragMode = dragKey !== null;

  return (
    <div>
      <form onSubmit={submit} className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter une tâche…"
          className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-indigo-500/60 focus:bg-zinc-900"
        />
        <label
          className="flex items-center gap-1 rounded-2xl border border-white/5 bg-zinc-900/60 px-2.5 py-2.5 text-xs text-zinc-400"
          title="Combien de fois par jour ?"
        >
          <span aria-hidden>×</span>
          <input
            type="number"
            min={1}
            max={99}
            value={draftTarget}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setDraftTarget(Number.isFinite(n) && n >= 1 ? Math.min(99, n) : 1);
            }}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            aria-label="Nombre de fois à faire"
            className="w-10 bg-transparent text-center text-sm text-zinc-100 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        <button
          type="submit"
          onAnimationEnd={() => setPopAdd(false)}
          className={[
            "rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90",
            popAdd ? "btn-pop" : "",
          ].join(" ")}
        >
          Ajouter
        </button>
      </form>

      {displayItems.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 text-center text-sm text-zinc-500">
          Rien à faire pour ce jour.
        </div>
      ) : (
        <ul className="space-y-2 select-none">
          {displayItems.map((ref, index) => {
            const key = refKey(ref);
            const isDragging = key === dragKey;
            const flashing = flashKeys.has(key);
            const entering = enterKeys.has(key);
            const isHabit = ref.kind === "habit";
            const habit = isHabit ? habitById.get(ref.id) : undefined;
            const task = !isHabit ? taskById.get(ref.id) : undefined;
            if (isHabit && !habit) return null;
            if (!isHabit && !task) return null;

            const target = getTarget(isHabit ? habit! : task!);
            const count = isHabit
              ? getHabitCount(completions, habit!.id, date)
              : getTaskCount(task!);
            const clamped = Math.min(count, target);
            const done = clamped >= target;
            const hasTarget = target > 1;
            const progressPct = target > 0 ? (clamped / target) * 100 : 0;
            const name = isHabit ? habit!.name : task!.name;

            const baseBorder = done
              ? "border-emerald-500/30 bg-emerald-500/10"
              : isHabit
                ? "border-indigo-400/20 bg-zinc-900/60"
                : "border-white/5 bg-zinc-900/60";

            return (
              <li
                key={key}
                ref={(el) => setLiRef(key, el)}
                style={{
                  touchAction: isDragMode ? "none" : "auto",
                  cursor: isDragging ? "grabbing" : "default",
                  transform: isDragging ? "scale(1.04)" : undefined,
                  zIndex: isDragging ? 10 : undefined,
                  position: "relative",
                  boxShadow: isDragging
                    ? "0 18px 40px rgba(0,0,0,0.55), 0 0 0 2px rgb(129 140 248)"
                    : undefined,
                  transition: isDragging
                    ? "transform 120ms ease-out"
                    : "transform 180ms",
                }}
                className={[
                  "group flex items-stretch overflow-hidden rounded-2xl border",
                  baseBorder,
                  flashing ? "task-complete-flash" : "",
                  entering ? "item-enter" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "w-1 shrink-0",
                    isHabit
                      ? "bg-gradient-to-b from-indigo-400 to-purple-500"
                      : "bg-zinc-700",
                  ].join(" ")}
                />
                <div className="flex flex-1 items-center gap-3 p-3.5">
                  <button
                    type="button"
                    onClick={() =>
                      isHabit
                        ? onIncrementHabit(habit!.id)
                        : onIncrementTask(task!.id)
                    }
                    className={[
                      "relative flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition",
                      hasTarget ? "h-7 w-7" : "h-6 w-6 border-2 text-xs",
                      done
                        ? hasTarget
                          ? "bg-emerald-500 text-white"
                          : "border-emerald-400 bg-emerald-500 text-white"
                        : hasTarget
                          ? "bg-zinc-800 text-zinc-200"
                          : "border-zinc-600 hover:border-zinc-400",
                      flashing ? "task-complete-check" : "",
                    ].join(" ")}
                    style={
                      hasTarget && !done
                        ? {
                            backgroundImage: `conic-gradient(rgb(129 140 248) ${progressPct}%, rgb(63 63 70) 0)`,
                          }
                        : undefined
                    }
                    aria-label={
                      hasTarget
                        ? `Fait ${clamped} sur ${target}`
                        : done
                          ? "Marquer non faite"
                          : "Marquer faite"
                    }
                  >
                    {hasTarget ? (
                      <span className="flex h-[calc(100%-4px)] w-[calc(100%-4px)] items-center justify-center rounded-full bg-zinc-900 text-zinc-100 leading-none">
                        {done ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span>
                            {clamped}
                            <span className="text-zinc-500">/{target}</span>
                          </span>
                        )}
                      </span>
                    ) : done ? (
                      "✓"
                    ) : (
                      ""
                    )}
                  </button>
                  <span
                    className={[
                      "flex-1 text-sm",
                      done ? "text-zinc-400 line-through" : "text-zinc-100",
                    ].join(" ")}
                  >
                    {name}
                  </span>
                  <span
                    className={[
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider",
                      isHabit
                        ? "border border-indigo-400/30 bg-indigo-500/10 text-indigo-300"
                        : "border border-zinc-600/40 bg-zinc-700/30 text-zinc-400",
                    ].join(" ")}
                  >
                    <span aria-hidden>{isHabit ? "↻" : "✓"}</span>
                    {isHabit ? "Habitude" : "Tâche"}
                  </span>
                  {!isHabit && (
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task!.id)}
                      className="text-xs text-zinc-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Réordonner"
                    onPointerDown={(e) =>
                      handleHandlePointerDown(key, index, e)
                    }
                    style={{
                      touchAction: "none",
                      cursor: isDragging ? "grabbing" : "grab",
                    }}
                    className="flex h-7 w-5 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                  >
                    <span aria-hidden className="leading-none">
                      ⋮⋮
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {displayItems.length > 0 && (
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Glisser la poignée ⋮⋮ à droite pour réordonner
        </p>
      )}
    </div>
  );
}
