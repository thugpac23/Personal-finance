export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import sql from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/login");

  const clerkUser = await currentUser();

  // Upsert profile on first access
  await sql`
    INSERT INTO profiles (id, full_name, avatar_url, email)
    VALUES (
      ${userId},
      ${clerkUser?.fullName ?? null},
      ${clerkUser?.imageUrl ?? null},
      ${clerkUser?.emailAddresses[0]?.emailAddress ?? null}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  const [profile] = await sql`
    SELECT full_name, avatar_url, currency FROM profiles WHERE id = ${userId}
  ` as { full_name: string | null; avatar_url: string | null; currency: string }[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={profile?.full_name ?? clerkUser?.emailAddresses[0]?.emailAddress ?? "User"}
          avatarUrl={profile?.avatar_url ?? clerkUser?.imageUrl ?? null}
          currency={profile?.currency ?? "EUR"}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
