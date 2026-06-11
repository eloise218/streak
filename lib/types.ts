export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekdays"; days: Weekday[] };

export type Habit = {
  id: string;
  name: string;
  recurrence: Recurrence;
  createdAt: string;
  deletedAt?: string;
  target?: number;
};

export type Task = {
  id: string;
  name: string;
  date: string;
  done: boolean;
  target?: number;
  count?: number;
};

export type Completion = {
  habitId: string;
  date: string;
  count?: number;
};

export type DayItemRef =
  | { kind: "habit"; id: string }
  | { kind: "task"; id: string };

export type DayOrder = Record<string, DayItemRef[]>;
