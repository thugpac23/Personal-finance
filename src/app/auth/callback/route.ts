import { NextResponse } from "next/server";

// Auth callbacks are handled by Clerk automatically.
// This route exists only for backwards-compat redirects.
export function GET() {
  return NextResponse.redirect(
    new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
}
