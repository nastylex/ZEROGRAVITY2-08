import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");
  if (session.user.role === "admin") redirect("/admin");
  return <Dashboard user={{ name: session.user.name || "there", email: session.user.email || "" }} />;
}
