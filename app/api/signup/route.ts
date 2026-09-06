import { NextResponse } from "next/server";
import { createUser } from "@/lib/user-data";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || password.length < 8 || name.trim().length < 2) return NextResponse.json({ error: "Enter a name and a password with at least 8 characters." }, { status: 400 });
    await createUser(email, password, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_EXISTS") return NextResponse.json({ error: "Unable to create this account." }, { status: 409 });
    console.error("[v0] Signup failed", error);
    return NextResponse.json({ error: "Unable to create your account right now." }, { status: 500 });
  }
}
