import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";

type HandlerFn<T> = (userId: string, req: Request) => Promise<
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } }
>;

export function withAuth<T>(handler: HandlerFn<T>) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
          { status: 401 }
        );
      }

      const result = await handler(userId, req);
      if (result.error) return NextResponse.json(result, { status: 400 });
      return NextResponse.json(result, { status: 200 });

    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { data: null, error: { message: "Validation error", code: "VALIDATION_ERROR", details: err.flatten().fieldErrors } },
          { status: 422 }
        );
      }
      console.error("[API Error]", err);
      return NextResponse.json(
        { data: null, error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
        { status: 500 }
      );
    }
  };
}

export function verifyWorkerSecret(req: Request): boolean {
  return req.headers.get("x-worker-secret") === process.env.WORKER_SECRET;
}
