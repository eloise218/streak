import type { Weekday } from "./types";

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function getWeekday(iso: string): Weekday {
  return fromISODate(iso).getDay() as Weekday;
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offsetToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offsetToMonday);
  return d;
}

export function endOfWeek(date: Date): Date {
  const s = startOfWeek(date);
  s.setDate(s.getDate() + 6);
  return s;
}

export function eachDayISO(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const start = fromISODate(fromISO);
  const end = fromISODate(toISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toISODate(d));
  }
  return out;
}

export const WEEKDAY_LABELS_FR: Record<Weekday, string> = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

export const MONTH_LABELS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function formatLongDateFR(iso: string): string {
  const d = fromISODate(iso);
  const weekday = WEEKDAY_LABELS_FR[d.getDay() as Weekday];
  return `${weekday} ${d.getDate()} ${MONTH_LABELS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
