-- SpendWise — Neon PostgreSQL schema
-- Run once: psql "$DATABASE_URL" -f neon/migrations/001_initial_schema.sql

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE transaction_type      AS ENUM ('income', 'expense');
CREATE TYPE recurrence_interval   AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE budget_period         AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE goal_status           AS ENUM ('active', 'completed', 'paused', 'cancelled');

-- ── Tables ───────────────────────────────────────────────────────────────────

-- User profiles — id is the Clerk user ID (string)
CREATE TABLE profiles (
  id          TEXT        PRIMARY KEY,
  full_name   TEXT,
  avatar_url  TEXT,
  email       TEXT,
  currency    TEXT        NOT NULL DEFAULT 'EUR',
  locale      TEXT        NOT NULL DEFAULT 'en-US',
  timezone    TEXT        NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories — system (user_id IS NULL) and user-defined
CREATE TABLE categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  name        TEXT        NOT NULL,
  type        transaction_type NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '📦',
  color       TEXT        NOT NULL DEFAULT '#6B7280',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, type)
);

CREATE TABLE transactions (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT            NOT NULL,
  category_id         UUID            REFERENCES categories(id) ON DELETE SET NULL,
  type                transaction_type NOT NULL,
  amount              NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
  currency            TEXT            NOT NULL DEFAULT 'EUR',
  description         TEXT            NOT NULL,
  date                DATE            NOT NULL,
  is_recurring_child  BOOLEAN         NOT NULL DEFAULT false,
  recurring_id        UUID,
  notes               TEXT,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_user_date     ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_category ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_type     ON transactions (user_id, type);
CREATE INDEX idx_transactions_month         ON transactions (user_id, date_trunc('month', date));

CREATE TABLE recurring_transactions (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT                NOT NULL,
  category_id   UUID                REFERENCES categories(id) ON DELETE SET NULL,
  type          transaction_type    NOT NULL,
  amount        NUMERIC(12, 2)      NOT NULL CHECK (amount > 0),
  currency      TEXT                NOT NULL DEFAULT 'EUR',
  description   TEXT                NOT NULL,
  interval      recurrence_interval NOT NULL,
  start_date    DATE                NOT NULL,
  end_date      DATE,
  next_due_date DATE                NOT NULL,
  is_active     BOOLEAN             NOT NULL DEFAULT true,
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT now()
);
CREATE INDEX idx_recurring_due ON recurring_transactions (next_due_date) WHERE is_active = true;

CREATE TABLE budgets (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT          NOT NULL,
  category_id UUID          NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period      budget_period NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    DATE,
  status         goal_status NOT NULL DEFAULT 'active',
  icon           TEXT        NOT NULL DEFAULT '🎯',
  color          TEXT        NOT NULL DEFAULT '#10B981',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Triggers (updated_at) ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_recurring_updated_at   BEFORE UPDATE ON recurring_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_budgets_updated_at     BEFORE UPDATE ON budgets     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_goals_updated_at       BEFORE UPDATE ON goals       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Materialized view — monthly summary ──────────────────────────────────────
CREATE MATERIALIZED VIEW mv_monthly_summary AS
SELECT
  user_id,
  date_trunc('month', date)::date AS month,
  type,
  SUM(amount)     AS total_amount,
  COUNT(*)::int   AS transaction_count
FROM transactions
GROUP BY user_id, date_trunc('month', date), type;

CREATE UNIQUE INDEX idx_mv_monthly_summary ON mv_monthly_summary (user_id, month, type);

-- ── Budget utilization function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_budget_utilization(p_user_id TEXT, p_month TEXT)
RETURNS TABLE (
  budget_id     UUID,
  budget_name   TEXT,
  category_id   UUID,
  category_name TEXT,
  budget_amount NUMERIC,
  spent_amount  NUMERIC,
  utilization   NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  v_start DATE := to_date(p_month, 'YYYY-MM');
  v_end   DATE := (v_start + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    b.id                                                              AS budget_id,
    c.name                                                            AS budget_name,
    b.category_id,
    c.name                                                            AS category_name,
    b.amount                                                          AS budget_amount,
    COALESCE(SUM(t.amount), 0)                                        AS spent_amount,
    CASE WHEN b.amount > 0 THEN COALESCE(SUM(t.amount), 0) / b.amount ELSE 0 END AS utilization
  FROM budgets b
  JOIN categories c ON b.category_id = c.id
  LEFT JOIN transactions t
    ON  t.category_id = b.category_id
    AND t.user_id     = b.user_id
    AND t.type        = 'expense'
    AND t.date BETWEEN v_start AND v_end
  WHERE b.user_id = p_user_id AND b.is_active = true
  GROUP BY b.id, c.name, b.category_id, b.amount;
END;
$$;
