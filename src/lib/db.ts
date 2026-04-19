import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

function connect() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

type SqlFn = (strings: TemplateStringsArray | string, ...values: unknown[]) => Promise<unknown[]>;

const sql: SqlFn = (strings, ...values) => {
  const db = connect();
  if (typeof strings === "string") {
    return db(strings, values[0] as unknown[]) as Promise<unknown[]>;
  }
  return db(strings as TemplateStringsArray, ...values) as Promise<unknown[]>;
};

export default sql;
