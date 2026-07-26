import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { DashboardContent } from "@/components/admin/dashboard-content";

// This page reads the session on every request, so it can't be statically
// prerendered.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();

  // Defense in depth — middleware already redirects unauthenticated
  // requests, but a server-side check here means this page is safe even
  // if middleware config ever changes.
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-white">Dashboard</h1>
            <p className="text-sm text-white/50">
              Signed in as {session.user?.email}
            </p>
          </div>
          <SignOutButton />
        </div>

        <DashboardContent />
      </div>
    </div>
  );
}
