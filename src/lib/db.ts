import { neon } from "@neondatabase/serverless";

// Lazy: neon() is only called at request time, not at module initialization.
// This prevents build-time failures when DATABASE_URL is not in the build env.
let _sql: ReturnType<typeof neon> | null = null;

function connect() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

type Sql = ReturnType<typeof neon>;

const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_t, _this, args) {
    return Reflect.apply(connect() as unknown as (...a: unknown[]) => unknown, connect(), args);
  },
  get(_t, prop) {
    const db = connect();
    const val = (db as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...a: unknown[]) => unknown).bind(db) : val;
  },
});

export default sql;
