-- ============================================================
-- SpendWise — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pg_stat_statements";

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
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text,
  avatar_url  text,
  currency    char(3)     not null default 'EUR',
  locale      text        not null default 'en-US',
  timezone    text        not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── CATEGORIES ────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
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
  on public.categories(coalesce(user_id::text, 'system'), lower(name), type);

-- ── TRANSACTIONS ──────────────────────────────────────────────
create table public.transactions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid             not null references public.profiles(id) on delete cascade,
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
create index idx_transactions_monthly  on public.transactions(user_id, date_trunc('month', date));

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

-- ── RECURRING TRANSACTIONS ────────────────────────────────────
create table public.recurring_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid                not null references public.profiles(id) on delete cascade,
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
  user_id     uuid          not null references public.profiles(id) on delete cascade,
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
  user_id         uuid           not null references public.profiles(id) on delete cascade,
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

-- ── MATERIALIZED VIEW ─────────────────────────────────────────
create materialized view public.mv_monthly_summary as
  select
    t.user_id,
    date_trunc('month', t.date)::date as month,
    t.type,
    c.id    as category_id,
    c.name  as category_name,
    c.color as category_color,
    count(*)         as transaction_count,
    sum(t.amount)    as total_amount,
    avg(t.amount)    as avg_amount
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  group by t.user_id, date_trunc('month', t.date), t.type, c.id, c.name, c.color
with no data;

create unique index idx_mv_monthly_summary
  on public.mv_monthly_summary(user_id, month, type, category_id);

select cron.schedule(
  'refresh-monthly-summary',
  '0 2 * * *',
  $$refresh materialized view concurrently public.mv_monthly_summary$$
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.transactions           enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.budgets                enable row level security;
alter table public.goals                  enable row level security;

-- profiles
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- categories
create policy "view system + own" on public.categories for select using (user_id is null or user_id = auth.uid());
create policy "insert own"        on public.categories for insert with check (user_id = auth.uid() and is_system = false);
create policy "update own"        on public.categories for update using (user_id = auth.uid() and is_system = false);
create policy "delete own"        on public.categories for delete using (user_id = auth.uid() and is_system = false);

-- transactions
create policy "own transactions" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- recurring
create policy "own recurring" on public.recurring_transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- budgets
create policy "own budgets" on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- goals
create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── BUDGET UTILIZATION FUNCTION ───────────────────────────────
create or replace function public.get_budget_utilization(
  p_user_id uuid,
  p_month   date default date_trunc('month', current_date)::date
)
returns table (
  budget_id     uuid,
  budget_name   text,
  category_id   uuid,
  category_name text,
  budget_amount numeric,
  spent_amount  numeric,
  utilization   numeric
) language sql security definer set search_path = public as $$
  select
    b.id,
    b.name,
    b.category_id,
    c.name,
    b.amount,
    coalesce(sum(t.amount), 0),
    round(coalesce(sum(t.amount), 0) / b.amount, 4)
  from public.budgets b
  left join public.categories c on c.id = b.category_id
  left join public.transactions t
    on  t.user_id     = b.user_id
    and t.category_id = b.category_id
    and t.type        = 'expense'
    and date_trunc('month', t.date) = date_trunc('month', p_month::timestamptz)
  where b.user_id   = p_user_id
    and b.is_active = true
  group by b.id, b.name, b.category_id, c.name, b.amount;
$$;
