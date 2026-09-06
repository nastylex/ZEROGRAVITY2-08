import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteOwnedFile, getFiles, saveFile, setShared } from "@/lib/user-data";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "admin") return null;
  return session.user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ files: await getFiles(user.id) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") || "My files").trim().slice(0, 80);
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "Files must be smaller than 100 MB." }, { status: 400 });
  const pathname = `users/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const blob = await put(pathname, file, { access: "private", addRandomSuffix: false, contentType: file.type || "application/octet-stream" });
  await saveFile(user.id, { name: file.name, pathname: blob.pathname, contentType: file.type || "application/octet-stream", size: file.size }, folder || "My files");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json();
  const file = await deleteOwnedFile(user.id, id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  await del(file.pathname);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, shared } = await request.json();
  await setShared(user.id, id, Boolean(shared));
  return NextResponse.json({ ok: true });
}

