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
import { createClient } from "./supabase/client";

function db() {
  return createClient();
}

// ---------- HABITS ----------

type HabitRow = {
  id: string;
  name: string;
  recurrence: Recurrence;
  created_at: string;
  deleted_at: string | null;
  target: number | null;
};

function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    recurrence: r.recurrence,
    createdAt: r.created_at,
    deletedAt: r.deleted_at ?? undefined,
    target: r.target ?? undefined,
  };
}

export async function loadHabits(): Promise<Habit[]> {
  const { data, error } = await db()
    .from("habits")
    .select("id, name, recurrence, created_at, deleted_at, target")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToHabit(row as HabitRow));
}

export async function insertHabit(habit: Habit): Promise<void> {
  const { error } = await db().from("habits").insert({
    id: habit.id,
    name: habit.name,
    recurrence: habit.recurrence,
    created_at: habit.createdAt,
    target: habit.target ?? null,
  });
  if (error) throw error;
}

export async function softDeleteHabit(id: string): Promise<void> {
  const { error } = await db()
    .from("habits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------- TASKS ----------

type TaskRow = {
  id: string;
  name: string;
  date: string;
  done: boolean;
  target: number | null;
  done_count: number | null;
};

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    done: r.done,
    target: r.target ?? undefined,
    count: r.done_count ?? undefined,
  };
}

export async function loadTasks(): Promise<Task[]> {
  const { data, error } = await db()
    .from("tasks")
    .select("id, name, date, done, target, done_count")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToTask(row as TaskRow));
}

export async function insertTask(task: Task): Promise<void> {
  const { error } = await db().from("tasks").insert({
    id: task.id,
    name: task.name,
    date: task.date,
    done: task.done,
    target: task.target ?? null,
    done_count: task.count ?? null,
  });
  if (error) throw error;
}

export async function updateTask(task: Task): Promise<void> {
  const { error } = await db()
    .from("tasks")
    .update({
      done: task.done,
      done_count: task.count ?? null,
    })
    .eq("id", task.id);
  if (error) throw error;
}

export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- COMPLETIONS ----------

type CompletionRow = {
  habit_id: string;
  date: string;
  done_count: number | null;
};

function rowToCompletion(r: CompletionRow): Completion {
  return {
    habitId: r.habit_id,
    date: r.date,
    count: r.done_count ?? undefined,
  };
}

export async function loadCompletions(): Promise<Completion[]> {
  const { data, error } = await db()
    .from("completions")
    .select("habit_id, date, done_count");
  if (error) throw error;
  return (data ?? []).map((row) => rowToCompletion(row as CompletionRow));
}

export async function upsertCompletion(c: Completion): Promise<void> {
  const { error } = await db().from("completions").upsert({
    habit_id: c.habitId,
    date: c.date,
    done_count: c.count ?? null,
  });
  if (error) throw error;
}

export async function deleteCompletion(
  habitId: string,
  date: string,
): Promise<void> {
  const { error } = await db()
    .from("completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("date", date);
  if (error) throw error;
}

// ---------- DAY ORDER ----------

type DayOrderRow = {
  date: string;
  refs: DayItemRef[];
};

export async function loadOrder(): Promise<DayOrder> {
  const { data, error } = await db().from("day_order").select("date, refs");
  if (error) throw error;
  const out: DayOrder = {};
  for (const row of (data ?? []) as DayOrderRow[]) {
    out[row.date] = row.refs;
  }
  return out;
}

export async function saveOrderForDate(
  date: string,
  refs: DayItemRef[],
): Promise<void> {
  const { error } = await db().from("day_order").upsert({ date, refs });
  if (error) throw error;
}

// ---------- PURE HELPERS (computation only, no I/O) ----------

export function getTarget(item: { target?: number }): number {
  const t = item.target;
  if (typeof t !== "number" || !Number.isFinite(t) || t < 1) return 1;
  return Math.floor(t);
}

export function getHabitCount(
  completions: Completion[],
  habitId: string,
  date: string,
): number {
  const c = completions.find(
    (x) => x.habitId === habitId && x.date === date,
  );
  if (!c) return 0;
  return typeof c.count === "number" ? c.count : 1;
}

export function getTaskCount(task: Task): number {
  if (typeof task.count === "number") return task.count;
  return task.done ? getTarget(task) : 0;
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
  habits: Habit[],
  tasks: Task[],
  completions: Completion[],
  date: string,
): DayItemRef[] {
  const notDone: DayItemRef[] = [];
  const done: DayItemRef[] = [];
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  for (const r of refs) {
    let isDone = false;
    if (r.kind === "habit") {
      const h = habitById.get(r.id);
      if (h) isDone = getHabitCount(completions, r.id, date) >= getTarget(h);
    } else {
      const t = taskById.get(r.id);
      if (t) isDone = getTaskCount(t) >= getTarget(t);
    }
    (isDone ? done : notDone).push(r);
  }
  return [...notDone, ...done];
}

export function incrementHabit(
  completions: Completion[],
  habit: Habit,
  date: string,
): Completion[] {
  const target = getTarget(habit);
  const current = getHabitCount(completions, habit.id, date);
  const next = current >= target ? 0 : current + 1;
  const without = completions.filter(
    (c) => !(c.habitId === habit.id && c.date === date),
  );
  if (next === 0) return without;
  return [...without, { habitId: habit.id, date, count: next }];
}

export function incrementTask(tasks: Task[], taskId: string): Task[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    const target = getTarget(t);
    const current = getTaskCount(t);
    const next = current >= target ? 0 : current + 1;
    return { ...t, count: next, done: next >= target };
  });
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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
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
  habit: Habit,
  completions: Completion[],
  date: string,
): boolean {
  return getHabitCount(completions, habit.id, date) >= getTarget(habit);
}

export function isTaskDone(task: Task): boolean {
  return getTaskCount(task) >= getTarget(task);
}

export function scoreForDate(
  habits: Habit[],
  tasks: Task[],
  completions: Completion[],
  date: string,
): { done: number; total: number; pct: number } {
  const dayHabits = habitsForDate(habits, date);
  const dayTasks = tasksForDate(tasks, date);
  let doneUnits = 0;
  let totalUnits = 0;
  for (const h of dayHabits) {
    const target = getTarget(h);
    const count = Math.min(getHabitCount(completions, h.id, date), target);
    doneUnits += count;
    totalUnits += target;
  }
  for (const t of dayTasks) {
    const target = getTarget(t);
    const count = Math.min(getTaskCount(t), target);
    doneUnits += count;
    totalUnits += target;
  }
  const pct = totalUnits === 0 ? 0 : Math.round((doneUnits / totalUnits) * 100);
  return { done: doneUnits, total: totalUnits, pct };
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
