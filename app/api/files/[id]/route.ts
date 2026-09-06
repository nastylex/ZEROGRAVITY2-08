import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnedFile } from "@/lib/user-data";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const file = await getOwnedFile(session.user.id, id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const result = await get(file.pathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") ?? undefined });
  if (!result) return new NextResponse("Not found", { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
  return new NextResponse(result.stream, { headers: { "Content-Type": result.blob.contentType, "Content-Disposition": `inline; filename="${file.name.replace(/"/g, "")}"`, ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
}
