"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(""); const response = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (!response.ok) { setError((await response.json()).error); setLoading(false); return; } const result = await signIn("credentials", { ...form, redirect: false }); if (result?.error) { setError("Account created. Please sign in."); router.push("/sign-in"); return; } router.push("/dashboard"); router.refresh(); }
  return <AuthShell title="Create your vault" subtitle="Start saving your files in a private space built for you."><form onSubmit={submit} className="flex flex-col gap-4"><Input placeholder="Your name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input placeholder="Email address" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Input placeholder="Password · 8+ characters" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />{error && <p className="text-sm text-destructive">{error}</p>}<Button disabled={loading} className="mt-2 w-full">{loading ? "Creating account..." : "Create account"}</Button><p className="text-center text-sm text-muted-foreground">Already have an account? <Link className="text-foreground underline underline-offset-4" href="/sign-in">Sign in</Link></p></form></AuthShell>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <main className="flex min-h-screen items-center justify-center bg-background px-5"><div className="w-full max-w-md"><Link href="/" className="mb-10 block font-mono text-xs tracking-[0.2em] text-cyan-300">ZEROGRAVITY / VAULT</Link><div className="rounded-lg border border-border bg-card p-7 shadow-2xl shadow-black/20"><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Private cloud storage</p><h1 className="mt-4 font-display text-3xl">{title}</h1><p className="mt-2 mb-7 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>{children}</div></div></main>; }
