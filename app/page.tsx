"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "@/components/Calendar";
import DayList from "@/components/DayList";
import ScoreCard from "@/components/ScoreCard";
import SignOutButton from "@/components/SignOutButton";
import {
  eachDayISO,
  endOfMonth,
  endOfWeek,
  formatLongDateFR,
  fromISODate,
  startOfMonth,
  startOfWeek,
  todayISO,
  toISODate,
} from "@/lib/date";
import {
  deleteCompletion,
  deleteTaskRow,
  getHabitCount,
  getTarget,
  getTaskCount,
  habitsForDate,
  incrementHabit,
  incrementTask,
  insertTask,
  loadCompletions,
  loadHabits,
  loadOrder,
  loadTasks,
  moveItem,
  newId,
  orderedItemsForDate,
  reorderDoneAtEnd,
  saveOrderForDate,
  scoreForDate,
  scoreForRange,
  tasksForDate,
  updateTask,
  upsertCompletion,
} from "@/lib/storage";
import type {
  Completion,
  DayItemRef,
  DayOrder,
  Habit,
  Task,
} from "@/lib/types";

// Let the completion flash play in place before the item slides to the bottom.
const REORDER_DELAY_MS = 700;

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<string>(() => todayISO());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [order, setOrder] = useState<DayOrder>({});

  useEffect(() => {
    (async () => {
      try {
        const [h, t, c, o] = await Promise.all([
          loadHabits(),
          loadTasks(),
          loadCompletions(),
          loadOrder(),
        ]);
        setHabits(h);
        setTasks(t);
        setCompletions(c);
        setOrder(o);
      } catch (e) {
        console.error("Échec du chargement des données :", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const items = useMemo(
    () => orderedItemsForDate(habits, tasks, order, selected),
    [habits, tasks, order, selected],
  );

  const dayHabits = useMemo(
    () => habitsForDate(habits, selected),
    [habits, selected],
  );
  const dayTasks = useMemo(
    () => tasksForDate(tasks, selected),
    [tasks, selected],
  );

  const today = useMemo(() => todayISO(), []);
  const isToday = selected === today;

  const relativeLabel = useMemo(() => {
    const offset = Math.round(
      (fromISODate(selected).getTime() - fromISODate(today).getTime()) /
        86400000,
    );
    if (offset === 0) return "Aujourd'hui";
    if (offset === 1) return "Demain";
    if (offset === -1) return "Hier";
    if (offset > 1) return `Dans ${offset} jours`;
    return `Il y a ${-offset} jours`;
  }, [selected, today]);

  const dayScore = useMemo(() => {
    const s = scoreForDate(habits, tasks, completions, selected);
    return { done: s.done, total: s.total };
  }, [habits, tasks, completions, selected]);

  const weekScore = useMemo(() => {
    const d = fromISODate(selected);
    const dates = eachDayISO(
      toISODate(startOfWeek(d)),
      toISODate(endOfWeek(d)),
    );
    const s = scoreForRange(habits, tasks, completions, dates, today);
    return { done: s.done, total: s.total };
  }, [habits, tasks, completions, selected, today]);

  const monthScore = useMemo(() => {
    const d = fromISODate(selected);
    const dates = eachDayISO(
      toISODate(startOfMonth(d)),
      toISODate(endOfMonth(d)),
    );
    const s = scoreForRange(habits, tasks, completions, dates, today);
    return { done: s.done, total: s.total };
  }, [habits, tasks, completions, selected, today]);

  const getScore = useCallback(
    (iso: string) => {
      const s = scoreForDate(habits, tasks, completions, iso);
      return { total: s.total, pct: s.pct };
    },
    [habits, tasks, completions],
  );

  function persistOrder(nextRefs: DayItemRef[]) {
    saveOrderForDate(selected, nextRefs).catch((e) =>
      console.error("save order:", e),
    );
  }

  function applySort(
    nextHabits: Habit[],
    nextTasks: Task[],
    nextCompletions: Completion[],
    extraRefs: DayItemRef[] = [],
  ) {
    const current = orderedItemsForDate(
      nextHabits,
      nextTasks,
      order,
      selected,
    );
    const withExtras = [...current, ...extraRefs];
    const sorted = reorderDoneAtEnd(
      withExtras,
      nextHabits,
      nextTasks,
      nextCompletions,
      selected,
    );
    const nextOrder: DayOrder = { ...order, [selected]: sorted };
    setOrder(nextOrder);
    persistOrder(sorted);
  }

  function bumpHabit(habitId: string) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const target = getTarget(habit);
    const wasDone = getHabitCount(completions, habit.id, selected) >= target;
    const next = incrementHabit(completions, habit, selected);
    setCompletions(next);
    const updated = next.find(
      (c) => c.habitId === habit.id && c.date === selected,
    );
    if (updated) {
      upsertCompletion(updated).catch((e) =>
        console.error("upsert completion:", e),
      );
    } else {
      deleteCompletion(habit.id, selected).catch((e) =>
        console.error("delete completion:", e),
      );
    }
    const becameDone =
      !wasDone && getHabitCount(next, habit.id, selected) >= target;
    if (becameDone) {
      window.setTimeout(() => applySort(habits, tasks, next), REORDER_DELAY_MS);
    } else {
      applySort(habits, tasks, next);
    }
  }

  function addTask(name: string, target = 1) {
    const id = newId();
    const newTask: Task = {
      id,
      name,
      date: selected,
      done: false,
      target: target > 1 ? target : undefined,
      count: 0,
    };
    const next: Task[] = [...tasks, newTask];
    setTasks(next);
    insertTask(newTask).catch((e) => console.error("insert task:", e));

    const newRef: DayItemRef = { kind: "task", id };
    const existing = orderedItemsForDate(habits, next, order, selected).filter(
      (r) => !(r.kind === "task" && r.id === id),
    );
    const sorted = reorderDoneAtEnd(
      [newRef, ...existing],
      habits,
      next,
      completions,
      selected,
    );
    const nextOrder: DayOrder = { ...order, [selected]: sorted };
    setOrder(nextOrder);
    persistOrder(sorted);
  }

  function bumpTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    const wasDone = task ? getTaskCount(task) >= getTarget(task) : false;
    const next = incrementTask(tasks, taskId);
    setTasks(next);
    const updated = next.find((t) => t.id === taskId);
    if (updated) {
      updateTask(updated).catch((e) => console.error("update task:", e));
    }
    const becameDone =
      !!updated && !wasDone && getTaskCount(updated) >= getTarget(updated);
    if (becameDone) {
      window.setTimeout(
        () => applySort(habits, next, completions),
        REORDER_DELAY_MS,
      );
    } else {
      applySort(habits, next, completions);
    }
  }

  function deleteTask(taskId: string) {
    const next = tasks.filter((t) => t.id !== taskId);
    setTasks(next);
    deleteTaskRow(taskId).catch((e) => console.error("delete task:", e));
    const dayRefs = order[selected];
    if (dayRefs) {
      const filtered = dayRefs.filter(
        (r) => !(r.kind === "task" && r.id === taskId),
      );
      const nextOrder: DayOrder = { ...order, [selected]: filtered };
      setOrder(nextOrder);
      persistOrder(filtered);
    }
  }

  function move(fromIndex: number, toIndex: number) {
    const nextOrder = moveItem(order, selected, items, fromIndex, toIndex);
    if (nextOrder === order) return;
    setOrder(nextOrder);
    const nextRefs = nextOrder[selected];
    if (nextRefs) persistOrder(nextRefs);
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6 text-sm text-zinc-500">
        Chargement…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Streak
          </h1>
          {isToday ? (
            <p className="mt-0.5 text-sm capitalize text-zinc-500">
              {formatLongDateFR(selected)}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setSelected(today)}
              aria-label="Revenir à aujourd'hui"
              className="group mt-1.5 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 py-1 pl-2.5 pr-2 text-xs text-amber-200 transition hover:bg-amber-500/20"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="capitalize">
                {relativeLabel}
                <span className="hidden text-amber-200/60 sm:inline">
                  {" · "}
                  {formatLongDateFR(selected)}
                </span>
              </span>
              <span className="ml-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 font-medium text-amber-100 transition group-hover:bg-amber-400/30">
                ↩ Aujourd&apos;hui
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/habits"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 backdrop-blur transition hover:bg-white/10"
          >
            Mes habitudes
          </a>
          <SignOutButton />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 lg:order-1">
          <section>
            <DayList
              items={items}
              habits={dayHabits}
              tasks={dayTasks}
              completions={completions}
              date={selected}
              onIncrementHabit={bumpHabit}
              onIncrementTask={bumpTask}
              onDeleteTask={deleteTask}
              onAddTask={addTask}
              onMove={move}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <ScoreCard day={dayScore} week={weekScore} month={monthScore} />
          <Calendar
            selected={selected}
            onSelect={setSelected}
            getScore={getScore}
          />
        </aside>
      </div>

      {!isToday && (
        <button
          type="button"
          onClick={() => setSelected(today)}
          className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/95 px-4 py-3 text-sm font-semibold text-amber-950 shadow-xl shadow-amber-900/40 backdrop-blur transition hover:bg-amber-400 active:scale-95 sm:bottom-6 sm:right-6"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <span aria-hidden>↩</span>
          Aujourd&apos;hui
        </button>
      )}
    </main>
  );
}
