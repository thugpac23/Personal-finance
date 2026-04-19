import { withAuth } from "@/lib/utils/api";
import sql from "@/lib/db";
import type { Profile } from "@/types";

export const GET = (req: Request) =>
  withAuth<Profile>(async (userId) => {
    const [profile] = await sql`SELECT * FROM profiles WHERE id = ${userId}` as Profile[];
    if (!profile) return { data: null, error: { message: "Profile not found" } };
    return { data: profile, error: null };
  })(req);

export const PATCH = (req: Request) =>
  withAuth<Profile>(async (userId) => {
    const body = await req.json() as Partial<Profile>;
    const [updated] = await sql`
      UPDATE profiles
      SET
        full_name = COALESCE(${body.full_name ?? null}, full_name),
        currency  = COALESCE(${body.currency  ?? null}, currency),
        locale    = COALESCE(${body.locale    ?? null}, locale),
        timezone  = COALESCE(${body.timezone  ?? null}, timezone)
      WHERE id = ${userId}
      RETURNING *
    ` as Profile[];
    return { data: updated, error: null };
  })(req);
