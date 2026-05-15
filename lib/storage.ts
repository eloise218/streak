"use client";

import type {
  Habit,
  Task,
  Completion,
  Recurrence,
  DayOrder,
  DayItemRef,
} from "./types";
import { getWeekday } from "./date";

const KEY_HABITS = "habitude:habits";
const KEY_TASKS = "habitude:tasks";
const KEY_COMPLETIONS = "habitude:completions";
const KEY_ORDER = "habitude:order";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadHabits(): Habit[] {
  return read<Habit[]>(KEY_HABITS, []);
}

export function saveHabits(habits: Habit[]): void {
  write(KEY_HABITS, habits);
}

export function loadTasks(): Task[] {
  return read<Task[]>(KEY_TASKS, []);
}

export function saveTasks(tasks: Task[]): void {
  write(KEY_TASKS, tasks);
}

export function loadCompletions(): Completion[] {
  return read<Completion[]>(KEY_COMPLETIONS, []);
}

export function saveCompletions(completions: Completion[]): void {
  write(KEY_COMPLETIONS, completions);
}

export function loadOrder(): DayOrder {
  return read<DayOrder>(KEY_ORDER, {});
}

export function saveOrder(order: DayOrder): void {
  write(KEY_ORDER, order);
}

export function orderedItemsForDate(
  habits: Habit[],
  tasks: Task[],
  order: DayOrder,
  date: string,
): DayItemRef[] {
  const dayHabits = habitsForDate(habits, date);
  const dayTasks = tasksForDate(tasks, date);
  const available = new Set<string>([
    ...dayHabits.map((h) => `habit:${h.id}`),
    ...dayTasks.map((t) => `task:${t.id}`),
  ]);
  const stored = order[date] ?? [];
  const seen = new Set<string>();
  const result: DayItemRef[] = [];
  for (const ref of stored) {
    const key = `${ref.kind}:${ref.id}`;
    if (available.has(key) && !seen.has(key)) {
      result.push(ref);
      seen.add(key);
    }
  }
  for (const h of dayHabits) {
    const key = `habit:${h.id}`;
    if (!seen.has(key)) {
      result.push({ kind: "habit", id: h.id });
      seen.add(key);
    }
  }
  for (const t of dayTasks) {
    const key = `task:${t.id}`;
    if (!seen.has(key)) {
      result.push({ kind: "task", id: t.id });
      seen.add(key);
    }
  }
  return result;
}

export function reorderDoneAtEnd(
  refs: DayItemRef[],
  tasks: Task[],
  completions: Completion[],
  date: string,
): DayItemRef[] {
  const notDone: DayItemRef[] = [];
  const done: DayItemRef[] = [];
  for (const r of refs) {
    const isDone =
      r.kind === "habit"
        ? completions.some((c) => c.habitId === r.id && c.date === date)
        : (tasks.find((t) => t.id === r.id)?.done ?? false);
    (isDone ? done : notDone).push(r);
  }
  return [...notDone, ...done];
}

export function moveItem(
  order: DayOrder,
  date: string,
  items: DayItemRef[],
  fromIndex: number,
  toIndex: number,
): DayOrder {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return { ...order, [date]: next };
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isHabitScheduled(habit: Habit, date: string): boolean {
  if (date < habit.createdAt.slice(0, 10)) return false;
  if (habit.deletedAt && date >= habit.deletedAt.slice(0, 10)) return false;
  if (habit.recurrence.kind === "daily") return true;
  return habit.recurrence.days.includes(getWeekday(date));
}

export function habitsForDate(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => isHabitScheduled(h, date));
}

export function tasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => t.date === date);
}

export function isHabitDone(
  completions: Completion[],
  habitId: string,
  date: string,
): boolean {
  return completions.some((c) => c.habitId === habitId && c.date === date);
}

export function scoreForDate(
  habits: Habit[],
  tasks: Task[],
  completions: Completion[],
  date: string,
): { done: number; total: number; pct: number } {
  const dayHabits = habitsForDate(habits, date);
  const dayTasks = tasksForDate(tasks, date);
  const habitDone = dayHabits.filter((h) =>
    isHabitDone(completions, h.id, date),
  ).length;
  const taskDone = dayTasks.filter((t) => t.done).length;
  const done = habitDone + taskDone;
  const total = dayHabits.length + dayTasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function scoreForRange(
  habits: Habit[],
  tasks: Task[],
  completions: Completion[],
  dates: string[],
  todayIso: string,
): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const d of dates) {
    if (d > todayIso) continue;
    const s = scoreForDate(habits, tasks, completions, d);
    done += s.done;
    total += s.total;
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function describeRecurrence(r: Recurrence): string {
  if (r.kind === "daily") return "Tous les jours";
  if (r.days.length === 0) return "Aucun jour";
  const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return r.days
    .slice()
    .sort()
    .map((d) => labels[d])
    .join(" ");
}
