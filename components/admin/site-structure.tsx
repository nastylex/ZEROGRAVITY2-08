"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SITE_PAGES } from "@/lib/analytics/site-map";
import { MapIcon, TreePine } from "lucide-react";

function fmt(n: number): string {
  return n.toLocaleString();
}

/**
 * "Web structure" panel: renders the site's page tree (from the static
 * manifest in lib/analytics/site-map.ts) enriched with the section breakdown
 * of each page and live visit counts from the analytics store.
 */
export function SiteStructure({
  structureViews,
}: {
  structureViews: Record<string, { views: number; visitors: number }>;
}) {
  const groups = Array.from(new Set(SITE_PAGES.map((p) => p.group)));
  const totalViews = Object.values(structureViews).reduce((s, v) => s + v.views, 0);

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TreePine className="size-4 text-violet-300" />
          Web structure
        </CardTitle>
        <CardDescription className="text-white/50">
          Site map — {SITE_PAGES.length} pages across {groups.length} groups ·{" "}
          {fmt(totalViews)} tracked views
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group}>
            <div className="mb-2 flex items-center gap-2">
              <MapIcon className="size-3 text-white/30" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                {group}
              </span>
              <span className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-3">
              {SITE_PAGES.filter((p) => p.group === group).map((page) => {
                const views = structureViews[page.path];
                return (
                  <div
                    key={page.path}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-cyan-200">
                          {page.path}
                        </span>
                        <span className="truncate text-sm font-medium text-white">{page.title}</span>
                      </div>
                      {views ? (
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span className="font-mono text-white/85">{fmt(views.views)}</span> views
                          <span className="text-white/25">·</span>
                          <span className="font-mono text-white/85">{fmt(views.visitors)}</span> uniq
                        </div>
                      ) : (
                        <Badge variant="outline" className="border-white/10 text-white/35">
                          no visits yet
                        </Badge>
                      )}
                    </div>
                    {page.sections.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {page.sections.map((s, i) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/55"
                          >
                            <span className="font-mono text-white/30">{i + 1}</span>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
