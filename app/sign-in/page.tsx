"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(""); const result = await signIn("credentials", { email, password, redirect: false }); if (result?.error) { setError("Invalid email or password."); setLoading(false); return; } router.push("/dashboard"); router.refresh(); }
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><div className="w-full max-w-md"><Link href="/" className="mb-10 block font-mono text-xs tracking-[0.2em] text-cyan-300">ZEROGRAVITY / VAULT</Link><div className="rounded-lg border border-border bg-card p-7 shadow-2xl shadow-black/20"><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p><h1 className="mt-4 font-display text-3xl">Sign in to your vault</h1><p className="mt-2 mb-7 text-sm leading-relaxed text-muted-foreground">Your files are waiting for you.</p><form onSubmit={submit} className="flex flex-col gap-4"><Input placeholder="Email address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Input placeholder="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p className="text-sm text-destructive">{error}</p>}<Button disabled={loading} className="mt-2 w-full">{loading ? "Signing in..." : "Sign in"}</Button><p className="text-center text-sm text-muted-foreground">New here? <Link className="text-foreground underline underline-offset-4" href="/sign-up">Create an account</Link></p></form></div></div></main>;
}
