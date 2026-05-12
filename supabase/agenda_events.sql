create table if not exists public.agenda_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  completed boolean not null default false,
  date_key date not null,
  start_time text not null,
  color text not null,
  tone text not null,
  reminder text not null,
  recurrence text not null default 'none',
  recurrence_interval integer not null default 1,
  recurrence_weekdays integer[] not null default '{}'::integer[],
  recurrence_end_date date,
  category text not null default 'personal',
  notification_id text,
  updated_at timestamptz not null default now()
);

alter table public.agenda_events
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.agenda_events
add column if not exists location text not null default '';

alter table public.agenda_events
add column if not exists completed boolean not null default false;

alter table public.agenda_events
add column if not exists recurrence_interval integer not null default 1;

alter table public.agenda_events
add column if not exists recurrence_weekdays integer[] not null default '{}'::integer[];

alter table public.agenda_events
add column if not exists recurrence_end_date date;

update public.agenda_events
set recurrence_interval = 1
where recurrence_interval is null;

update public.agenda_events
set recurrence_weekdays = '{}'::integer[]
where recurrence_weekdays is null;

alter table public.agenda_events enable row level security;

drop policy if exists "Public agenda events read" on public.agenda_events;
drop policy if exists "Public agenda events insert" on public.agenda_events;
drop policy if exists "Public agenda events update" on public.agenda_events;
drop policy if exists "Public agenda events delete" on public.agenda_events;
drop policy if exists "Users can read own agenda events" on public.agenda_events;
drop policy if exists "Users can insert own agenda events" on public.agenda_events;
drop policy if exists "Users can update own agenda events" on public.agenda_events;
drop policy if exists "Users can delete own agenda events" on public.agenda_events;

create policy "Users can read own agenda events"
on public.agenda_events for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own agenda events"
on public.agenda_events for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own agenda events"
on public.agenda_events for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own agenda events"
on public.agenda_events for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_agenda_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agenda_events_updated_at on public.agenda_events;

create trigger set_agenda_events_updated_at
before update on public.agenda_events
for each row
execute function public.set_agenda_events_updated_at();

alter table public.agenda_events drop column if exists end_time;

alter table public.agenda_events
  alter column description set default '',
  alter column location set default '',
  alter column completed set default false,
  alter column recurrence set default 'none',
  alter column recurrence_interval set default 1,
  alter column recurrence_interval set not null,
  alter column recurrence_weekdays set default '{}'::integer[],
  alter column recurrence_weekdays set not null,
  alter column category set default 'personal';

-- Validaciones suaves para evitar datos raros desde la app.
alter table public.agenda_events
  drop constraint if exists agenda_events_recurrence_check,
  add constraint agenda_events_recurrence_check
  check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

alter table public.agenda_events
  drop constraint if exists agenda_events_category_check;

alter table public.agenda_events
  alter column category set not null;

alter table public.agenda_events
  drop constraint if exists agenda_events_recurrence_interval_check,
  add constraint agenda_events_recurrence_interval_check
  check (recurrence_interval between 1 and 365);

alter table public.agenda_events
  drop constraint if exists agenda_events_recurrence_weekdays_check,
  add constraint agenda_events_recurrence_weekdays_check
  check (recurrence_weekdays <@ array[0,1,2,3,4,5,6]);

-- La app guarda horas tipo HH:mm.
alter table public.agenda_events
  drop constraint if exists agenda_events_start_time_format_check,
  add constraint agenda_events_start_time_format_check
  check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- Índices útiles para cargar eventos del usuario por fecha y estado.
create index if not exists agenda_events_user_date_idx
on public.agenda_events (user_id, date_key);

create index if not exists agenda_events_user_date_time_idx
on public.agenda_events (user_id, date_key, start_time);

create index if not exists agenda_events_user_completed_idx
on public.agenda_events (user_id, completed);

create index if not exists agenda_events_user_category_idx
on public.agenda_events (user_id, category);

create table if not exists public.agenda_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  label text not null,
  icon text not null default 'pricetag-outline',
  color text not null default '#E05D5D',
  tone text not null default '#FDECEC',
  sort_order integer not null default 999,
  is_default boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.agenda_categories enable row level security;

drop policy if exists "Users can read own agenda categories" on public.agenda_categories;
drop policy if exists "Users can insert own agenda categories" on public.agenda_categories;
drop policy if exists "Users can update own agenda categories" on public.agenda_categories;
drop policy if exists "Users can delete own agenda categories" on public.agenda_categories;

create policy "Users can read own agenda categories"
on public.agenda_categories for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own agenda categories"
on public.agenda_categories for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own agenda categories"
on public.agenda_categories for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own agenda categories"
on public.agenda_categories for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_agenda_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agenda_categories_updated_at on public.agenda_categories;

create trigger set_agenda_categories_updated_at
before update on public.agenda_categories
for each row
execute function public.set_agenda_categories_updated_at();

create index if not exists agenda_categories_user_sort_idx
on public.agenda_categories (user_id, sort_order);

create table if not exists public.agenda_event_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  event_id text not null references public.agenda_events(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.agenda_event_tasks
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.agenda_event_tasks
add column if not exists event_id text references public.agenda_events(id) on delete cascade;

alter table public.agenda_event_tasks
add column if not exists title text not null default '';

alter table public.agenda_event_tasks
add column if not exists completed boolean not null default false;

alter table public.agenda_event_tasks
add column if not exists sort_order integer not null default 0;

update public.agenda_event_tasks
set completed = false
where completed is null;

update public.agenda_event_tasks
set sort_order = 0
where sort_order is null;

alter table public.agenda_event_tasks enable row level security;

drop policy if exists "Users can read own agenda event tasks" on public.agenda_event_tasks;
drop policy if exists "Users can insert own agenda event tasks" on public.agenda_event_tasks;
drop policy if exists "Users can update own agenda event tasks" on public.agenda_event_tasks;
drop policy if exists "Users can delete own agenda event tasks" on public.agenda_event_tasks;

create policy "Users can read own agenda event tasks"
on public.agenda_event_tasks for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own agenda event tasks"
on public.agenda_event_tasks for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own agenda event tasks"
on public.agenda_event_tasks for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own agenda event tasks"
on public.agenda_event_tasks for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_agenda_event_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agenda_event_tasks_updated_at on public.agenda_event_tasks;

create trigger set_agenda_event_tasks_updated_at
before update on public.agenda_event_tasks
for each row
execute function public.set_agenda_event_tasks_updated_at();

alter table public.agenda_event_tasks
  alter column title set not null,
  alter column title set default '',
  alter column completed set default false,
  alter column completed set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists agenda_event_tasks_user_event_idx
on public.agenda_event_tasks (user_id, event_id, sort_order);
