"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "@/components/Calendar";
import DayList from "@/components/DayList";
import ScoreCard from "@/components/ScoreCard";
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
  habitsForDate,
  isHabitDone,
  loadCompletions,
  loadHabits,
  loadOrder,
  loadTasks,
  moveItem,
  newId,
  orderedItemsForDate,
  reorderDoneAtEnd,
  saveCompletions,
  saveOrder,
  saveTasks,
  scoreForDate,
  scoreForRange,
  tasksForDate,
} from "@/lib/storage";
import type {
  Completion,
  DayItemRef,
  DayOrder,
  Habit,
  Task,
} from "@/lib/types";

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<string>(() => todayISO());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [order, setOrder] = useState<DayOrder>({});

  useEffect(() => {
    setHabits(loadHabits());
    setTasks(loadTasks());
    setCompletions(loadCompletions());
    setOrder(loadOrder());
    setHydrated(true);
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
      nextTasks,
      nextCompletions,
      selected,
    );
    const nextOrder: DayOrder = { ...order, [selected]: sorted };
    setOrder(nextOrder);
    saveOrder(nextOrder);
  }

  function toggleHabit(habitId: string) {
    const exists = completions.some(
      (c) => c.habitId === habitId && c.date === selected,
    );
    const next = exists
      ? completions.filter(
          (c) => !(c.habitId === habitId && c.date === selected),
        )
      : [...completions, { habitId, date: selected }];
    setCompletions(next);
    saveCompletions(next);
    applySort(habits, tasks, next);
  }

  function addTask(name: string) {
    const id = newId();
    const next: Task[] = [
      ...tasks,
      { id, name, date: selected, done: false },
    ];
    setTasks(next);
    saveTasks(next);
    applySort(habits, next, completions, [{ kind: "task", id }]);
  }

  function toggleTask(taskId: string) {
    const next = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t,
    );
    setTasks(next);
    saveTasks(next);
    applySort(habits, next, completions);
  }

  function deleteTask(taskId: string) {
    const next = tasks.filter((t) => t.id !== taskId);
    setTasks(next);
    saveTasks(next);
    const dayRefs = order[selected];
    if (dayRefs) {
      const nextOrder: DayOrder = {
        ...order,
        [selected]: dayRefs.filter(
          (r) => !(r.kind === "task" && r.id === taskId),
        ),
      };
      setOrder(nextOrder);
      saveOrder(nextOrder);
    }
  }

  function move(fromIndex: number, toIndex: number) {
    const nextOrder = moveItem(order, selected, items, fromIndex, toIndex);
    if (nextOrder === order) return;
    setOrder(nextOrder);
    saveOrder(nextOrder);
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
          <p className="mt-0.5 text-sm capitalize text-zinc-500">
            {formatLongDateFR(selected)}
          </p>
        </div>
        <a
          href="/habits"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 backdrop-blur transition hover:bg-white/10"
        >
          Mes habitudes
        </a>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 lg:order-1">
          <section>
            <DayList
              items={items}
              habits={dayHabits}
              tasks={dayTasks}
              isHabitDone={(id) => isHabitDone(completions, id, selected)}
              onToggleHabit={toggleHabit}
              onToggleTask={toggleTask}
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
    </main>
  );
}
