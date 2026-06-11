-- Streak: initial schema (habits, tasks, completions, day_order)
-- Each row is scoped to auth.uid() via RLS.

create table public.habits (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
    name text not null,
    recurrence jsonb not null,
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    target integer
);

create index habits_user_id_idx on public.habits (user_id);

create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
    name text not null,
    date date not null,
    done boolean not null default false,
    target integer,
    done_count integer
);

create index tasks_user_id_date_idx on public.tasks (user_id, date);

create table public.completions (
    user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
    habit_id uuid not null references public.habits (id) on delete cascade,
    date date not null,
    done_count integer,
    primary key (user_id, habit_id, date)
);

create index completions_user_id_date_idx on public.completions (user_id, date);

create table public.day_order (
    user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
    date date not null,
    refs jsonb not null,
    primary key (user_id, date)
);

alter table public.habits enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;
alter table public.day_order enable row level security;

create policy "habits are owner-scoped" on public.habits
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "tasks are owner-scoped" on public.tasks
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "completions are owner-scoped" on public.completions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "day_order is owner-scoped" on public.day_order
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
