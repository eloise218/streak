export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RecurrenceJson =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] };

export type DayItemRefJson =
  | { kind: "habit"; id: string }
  | { kind: "task"; id: string };

export interface Database {
  public: {
    Tables: {
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          recurrence: RecurrenceJson;
          created_at: string;
          deleted_at: string | null;
          target: number | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          recurrence: RecurrenceJson;
          created_at?: string;
          deleted_at?: string | null;
          target?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          recurrence?: RecurrenceJson;
          created_at?: string;
          deleted_at?: string | null;
          target?: number | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          date: string;
          done: boolean;
          target: number | null;
          done_count: number | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          date: string;
          done?: boolean;
          target?: number | null;
          done_count?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          date?: string;
          done?: boolean;
          target?: number | null;
          done_count?: number | null;
        };
        Relationships: [];
      };
      completions: {
        Row: {
          user_id: string;
          habit_id: string;
          date: string;
          done_count: number | null;
        };
        Insert: {
          user_id?: string;
          habit_id: string;
          date: string;
          done_count?: number | null;
        };
        Update: {
          user_id?: string;
          habit_id?: string;
          date?: string;
          done_count?: number | null;
        };
        Relationships: [];
      };
      day_order: {
        Row: {
          user_id: string;
          date: string;
          refs: DayItemRefJson[];
        };
        Insert: {
          user_id?: string;
          date: string;
          refs: DayItemRefJson[];
        };
        Update: {
          user_id?: string;
          date?: string;
          refs?: DayItemRefJson[];
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
