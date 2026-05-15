"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DayItemRef, Habit, Task } from "@/lib/types";

type Props = {
  items: DayItemRef[];
  habits: Habit[];
  tasks: Task[];
  isHabitDone: (habitId: string) => boolean;
  onToggleHabit: (habitId: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (name: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 12;

function refKey(r: DayItemRef) {
  return `${r.kind}:${r.id}`;
}

export default function DayList({
  items,
  habits,
  tasks,
  isHabitDone,
  onToggleHabit,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onMove,
}: Props) {
  const [draft, setDraft] = useState("");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const pressTimerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const liRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dragKeyRef = useRef<string | null>(null);
  const overIndexRef = useRef<number | null>(null);
  const virtualYRef = useRef<number>(0);
  const slotMidsRef = useRef<number[]>([]);

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

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) {
        window.clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

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

  function cancelPress() {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    startPosRef.current = null;
  }

  function handlePointerDown(
    key: string,
    index: number,
    e: React.PointerEvent<HTMLLIElement>,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button, input, a")) return;

    startPosRef.current = { x: e.clientX, y: e.clientY };
    cancelPress();

    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      virtualYRef.current = startPosRef.current?.y ?? 0;
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
    }, LONG_PRESS_MS);
  }

  function handleHandlePointerDown(
    key: string,
    index: number,
    e: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    cancelPress();
    virtualYRef.current = e.clientY;
    captureSlotMids();
    setDragKey(key);
    setOverIndex(index);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLLIElement>) {
    if (pressTimerRef.current === null) return;
    const start = startPosRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) cancelPress();
  }

  function handlePointerUp() {
    if (pressTimerRef.current !== null) cancelPress();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onAddTask(name);
    setDraft("");
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
          className="flex-1 rounded-2xl border border-white/5 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-indigo-500/60 focus:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90"
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
            const isHabit = ref.kind === "habit";
            const habit = isHabit ? habitById.get(ref.id) : undefined;
            const task = !isHabit ? taskById.get(ref.id) : undefined;
            if (isHabit && !habit) return null;
            if (!isHabit && !task) return null;

            const done = isHabit
              ? isHabitDone(habit!.id)
              : (task!.done as boolean);
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
                onPointerDown={(e) => handlePointerDown(key, index, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                  touchAction: isDragMode ? "none" : "auto",
                  cursor: isDragging ? "grabbing" : "grab",
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
                      isHabit ? onToggleHabit(habit!.id) : onToggleTask(task!.id)
                    }
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition",
                      done
                        ? "border-emerald-400 bg-emerald-500 text-white"
                        : "border-zinc-600 hover:border-zinc-400",
                    ].join(" ")}
                    aria-label={done ? "Marquer non faite" : "Marquer faite"}
                  >
                    {done ? "✓" : ""}
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
          Glisser la poignée ⋮⋮ ou maintenir cliqué un instant pour réordonner
        </p>
      )}
    </div>
  );
}
