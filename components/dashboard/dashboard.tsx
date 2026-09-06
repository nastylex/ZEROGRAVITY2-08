"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Archive, Download, File, FileImage, FileText, Folder, HardDrive, Link2, LogOut, MoreHorizontal, Plus, Search, Share2, Trash2, Upload, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { StoredFile } from "@/lib/user-data";

type Props = { user: { name: string; email: string } };

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(1)} GB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <FileImage className="size-5 text-cyan-300" />;
  if (type.includes("pdf") || type.includes("text")) return <FileText className="size-5 text-amber-300" />;
  return <File className="size-5 text-muted-foreground" />;
}

export function Dashboard({ user }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All files");
  const [folderName, setFolderName] = useState("My files");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFiles() {
    const response = await fetch("/api/files");
    if (response.ok) setFiles((await response.json()).files);
  }
  useEffect(() => { loadFiles(); }, []);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setUploading(true); setMessage("");
    const data = new FormData(); data.append("file", selected); data.append("folder", folderName);
    const response = await fetch("/api/files", { method: "POST", body: data });
    setUploading(false); event.target.value = "";
    if (!response.ok) { setMessage((await response.json()).error || "Upload failed."); return; }
    setMessage("File uploaded to your vault."); await loadFiles();
  }

  async function removeFile(id: string) {
    if (!window.confirm("Delete this file permanently?")) return;
    await fetch("/api/files", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadFiles();
  }

  async function toggleShare(file: StoredFile) {
    await fetch("/api/files", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: file.id, shared: !file.isShared }) });
    await loadFiles();
  }

  const folders = ["All files", ...Array.from(new Set(files.map((file) => file.folder)))];
  const visibleFiles = useMemo(() => files.filter((file) => (folder === "All files" || file.folder === folder) && file.name.toLowerCase().includes(query.toLowerCase())), [files, folder, query]);
  const totalSize = files.reduce((total, file) => total + file.size, 0);

  return <main className="min-h-screen bg-background text-foreground">
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/40 p-5 md:flex md:flex-col">
        <div className="flex items-center gap-3 px-2"><div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-sm font-bold">ZG</div><span className="font-mono text-sm tracking-widest">ZEROGRAVITY</span></div>
        <nav className="mt-12 flex flex-col gap-1 text-sm">
          {folders.map((name) => <button key={name} onClick={() => setFolder(name)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${folder === name ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Folder className="size-4" />{name}</button>)}
        </nav>
        <div className="mt-auto rounded-lg border border-border bg-muted/40 p-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Storage used</span><HardDrive className="size-4" /></div><p className="mt-2 font-mono text-lg">{formatSize(totalSize)}</p><div className="mt-3 h-1 rounded-full bg-border"><div className="h-1 w-[8%] rounded-full bg-cyan-300" /></div><p className="mt-2 text-xs text-muted-foreground">of 100 GB</p></div>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-4 md:px-8"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">Personal vault</p><h1 className="mt-1 font-display text-3xl">Good morning, {user.name.split(" ")[0]}.</h1></div><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Account settings"><UserRound className="size-4" /></Button><Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/" })}><LogOut className="size-4" /></Button></div></header>
        <div className="flex flex-col gap-8 p-5 md:p-8">
          <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Files stored</p><p className="mt-3 font-mono text-3xl">{files.length.toString().padStart(2, "0")}</p></div><div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Storage used</p><p className="mt-3 font-mono text-3xl">{formatSize(totalSize)}</p></div><div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Shared files</p><p className="mt-3 font-mono text-3xl">{files.filter((file) => file.isShared).length.toString().padStart(2, "0")}</p></div></div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl">Your files</h2><p className="text-sm text-muted-foreground">Private by default. Ready wherever you are.</p></div><div className="flex gap-2"><Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Folder name" className="w-36" aria-label="Folder name" /><input ref={inputRef} type="file" className="hidden" onChange={upload} /><Button onClick={() => inputRef.current?.click()} disabled={uploading}><Upload data-icon="inline-start" />{uploading ? "Uploading..." : "Upload file"}</Button></div></div>
          {message && <p className="text-sm text-cyan-300">{message}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2 overflow-x-auto">{folders.map((name) => <Button key={name} size="sm" variant={folder === name ? "secondary" : "ghost"} onClick={() => setFolder(name)}>{name}</Button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files" className="pl-9 sm:w-56" aria-label="Search files" /></div></div>
          <div className="overflow-hidden rounded-lg border border-border bg-card"><div className="hidden grid-cols-[1fr_140px_120px_100px] gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground md:grid"><span>Name</span><span>Folder</span><span>Modified</span><span className="text-right">Size</span></div>{visibleFiles.length === 0 ? <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center"><Archive className="size-8 text-muted-foreground" /><h3 className="font-medium">Your vault is ready</h3><p className="max-w-sm text-sm text-muted-foreground">Upload a file to start building your private library.</p></div> : visibleFiles.map((file) => <div key={file.id} className="grid gap-3 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1fr_140px_120px_100px] md:items-center md:gap-4"><div className="flex min-w-0 items-center gap-3"><FileIcon type={file.contentType} /><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground md:hidden">{formatSize(file.size)} · {file.folder}</p></div></div><span className="hidden truncate text-sm text-muted-foreground md:block">{file.folder}</span><span className="hidden text-sm text-muted-foreground md:block">{new Date(file.createdAt).toLocaleDateString()}</span><div className="flex items-center justify-between gap-2 md:justify-end"><span className="text-sm text-muted-foreground">{formatSize(file.size)}</span><div className="flex items-center gap-1"><a href={`/api/files/${file.id}`} download={file.name} aria-label={`Download ${file.name}`}><Button variant="ghost" size="icon"><Download className="size-4" /></Button></a><Button variant="ghost" size="icon" aria-label={file.isShared ? "Stop sharing" : "Share file"} onClick={() => toggleShare(file)}><Share2 className={file.isShared ? "size-4 text-cyan-300" : "size-4"} /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${file.name}`} onClick={() => removeFile(file.id)}><Trash2 className="size-4 text-destructive" /></Button></div></div></div>)}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" /><span>{user.email}</span><Separator className="flex-1" /></div>
        </div>
      </section>
    </div>
  </main>;
}
