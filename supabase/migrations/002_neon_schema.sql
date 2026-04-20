-- ============================================================
-- SpendWise — Neon Schema (Clerk auth, no Supabase)
-- Run this in Neon dashboard → SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Types ─────────────────────────────────────────────────────
create type transaction_type     as enum ('income', 'expense');
create type recurrence_interval  as enum ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
create type budget_period        as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type goal_status          as enum ('active', 'completed', 'paused', 'cancelled');

-- ── updated_at helper ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── PROFILES ──────────────────────────────────────────────────
-- id is Clerk user ID (text, e.g. "user_2abc123")
create table public.profiles (
  id          text        primary key,
  email       text        not null,
  full_name   text,
  avatar_url  text,
  currency    char(3)     not null default 'EUR',
  locale      text        not null default 'en-US',
  timezone    text        not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── CATEGORIES ────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text references public.profiles(id) on delete cascade,
  name        text             not null,
  icon        text             not null default '📦',
  color       text             not null default '#8E8E93',
  type        transaction_type not null,
  is_system   boolean          not null default false,
  sort_order  smallint         not null default 0,
  created_at  timestamptz      not null default now()
);

create index idx_categories_user_id on public.categories(user_id);
create index idx_categories_type    on public.categories(type);
create unique index idx_categories_unique_name
  on public.categories(coalesce(user_id, 'system'), lower(name), type);

-- ── TRANSACTIONS ──────────────────────────────────────────────
create table public.transactions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             text             not null references public.profiles(id) on delete cascade,
  category_id         uuid             references public.categories(id) on delete set null,
  recurring_id        uuid,
  type                transaction_type not null,
  amount              numeric(14,4)    not null check (amount > 0),
  currency            char(3)          not null default 'EUR',
  description         text             not null,
  notes               text,
  date                date             not null,
  is_recurring_child  boolean          not null default false,
  created_at          timestamptz      not null default now(),
  updated_at          timestamptz      not null default now()
);

create index idx_transactions_user_id  on public.transactions(user_id);
create index idx_transactions_date     on public.transactions(user_id, date desc);
create index idx_transactions_category on public.transactions(user_id, category_id);
create index idx_transactions_type     on public.transactions(user_id, type);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

-- ── RECURRING TRANSACTIONS ────────────────────────────────────
create table public.recurring_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       text                not null references public.profiles(id) on delete cascade,
  category_id   uuid                references public.categories(id) on delete set null,
  type          transaction_type    not null,
  amount        numeric(14,4)       not null check (amount > 0),
  currency      char(3)             not null default 'EUR',
  description   text                not null,
  interval      recurrence_interval not null,
  start_date    date                not null,
  end_date      date,
  next_due_date date                not null,
  last_run_at   timestamptz,
  is_active     boolean             not null default true,
  created_at    timestamptz         not null default now(),
  updated_at    timestamptz         not null default now()
);

create index idx_recurring_user_id  on public.recurring_transactions(user_id);
create index idx_recurring_next_due on public.recurring_transactions(next_due_date) where is_active = true;

alter table public.transactions
  add constraint fk_transactions_recurring
  foreign key (recurring_id) references public.recurring_transactions(id) on delete set null;

create trigger recurring_updated_at
  before update on public.recurring_transactions
  for each row execute procedure public.set_updated_at();

-- ── BUDGETS ───────────────────────────────────────────────────
create table public.budgets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text          not null references public.profiles(id) on delete cascade,
  category_id uuid          references public.categories(id) on delete cascade,
  name        text          not null,
  amount      numeric(14,4) not null check (amount > 0),
  currency    char(3)       not null default 'EUR',
  period      budget_period not null default 'monthly',
  start_date  date          not null,
  end_date    date,
  is_active   boolean       not null default true,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index idx_budgets_user_id  on public.budgets(user_id);
create index idx_budgets_category on public.budgets(user_id, category_id);
create index idx_budgets_active   on public.budgets(user_id) where is_active = true;

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute procedure public.set_updated_at();

-- ── GOALS ─────────────────────────────────────────────────────
create table public.goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         text           not null references public.profiles(id) on delete cascade,
  name            text           not null,
  target_amount   numeric(14,4)  not null check (target_amount > 0),
  current_amount  numeric(14,4)  not null default 0 check (current_amount >= 0),
  currency        char(3)        not null default 'EUR',
  target_date     date,
  status          goal_status    not null default 'active',
  icon            text           not null default '🎯',
  notes           text,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

create index idx_goals_user_id on public.goals(user_id);
create index idx_goals_status  on public.goals(user_id, status);

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.set_updated_at();

-- ── SEED: 21 system categories ────────────────────────────────
insert into public.categories (name, icon, color, type, is_system, sort_order) values
  ('Salary',         '💼', '#34C759', 'income',  true, 1),
  ('Freelance',      '💻', '#30D158', 'income',  true, 2),
  ('Investment',     '📈', '#007AFF', 'income',  true, 3),
  ('Rental Income',  '🏠', '#5AC8FA', 'income',  true, 4),
  ('Cashback',       '💳', '#32ADE6', 'income',  true, 5),
  ('Other Income',   '💰', '#8E8E93', 'income',  true, 6),
  ('Housing',        '🏠', '#FF6B8A', 'expense', true, 1),
  ('Food & Dining',  '🍽️', '#34C759', 'expense', true, 2),
  ('Transport',      '🚗', '#FF9500', 'expense', true, 3),
  ('Entertainment',  '🎭', '#AF52DE', 'expense', true, 4),
  ('Shopping',       '🛍️', '#FF2D55', 'expense', true, 5),
  ('Health',         '💊', '#FF3B30', 'expense', true, 6),
  ('Education',      '📚', '#5B8AF5', 'expense', true, 7),
  ('Travel',         '✈️', '#FFCC00', 'expense', true, 8),
  ('Subscriptions',  '🔄', '#FF9F0A', 'expense', true, 9),
  ('Personal Care',  '👤', '#32ADE6', 'expense', true, 10),
  ('Child',          '👶', '#FF6B8A', 'expense', true, 11),
  ('Savings',        '💰', '#30D158', 'expense', true, 12),
  ('Investments',    '📊', '#007AFF', 'expense', true, 13),
  ('Utilities',      '⚡', '#FF9500', 'expense', true, 14),
  ('Other',          '📦', '#8E8E93', 'expense', true, 99);
