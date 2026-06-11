-- Add target (max count per day) and done_count (current progress) columns.
-- Column name is "done_count" rather than "count" because PostgREST
-- interprets bare "count" in select clauses as the aggregate function.

alter table public.habits add column if not exists target integer;
alter table public.tasks add column if not exists target integer;
alter table public.tasks add column if not exists done_count integer;
alter table public.completions add column if not exists done_count integer;
