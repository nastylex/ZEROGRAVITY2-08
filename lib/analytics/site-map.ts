/**
 * Static description of the site's structure ("web structure").
 *
 * Mirrors the routes and section composition of the application so the admin
 * dashboard can render a page tree that works even before any visits are
 * tracked. The structure view in the admin panel combines this manifest with
 * live visit counts from the analytics store.
 */

export interface SiteSection {
  id: string;
  label: string;
}

export interface SitePage {
  path: string;
  title: string;
  group: string;
  sections: SiteSection[];
}

export const SITE_PAGES: SitePage[] = [
  {
    path: "/",
    title: "Home — AirSPACEx",
    group: "Landing",
    sections: [
      { id: "navigation", label: "Navigation" },
      { id: "hero", label: "Hero" },
      { id: "features", label: "Features" },
      { id: "how-it-works", label: "How it works" },
      { id: "infrastructure", label: "Infrastructure" },
      { id: "metrics", label: "Metrics" },
      { id: "integrations", label: "Integrations" },
      { id: "security", label: "Security" },
      { id: "developers", label: "Developers" },
      { id: "testimonials", label: "Testimonials" },
      { id: "pricing", label: "Pricing" },
      { id: "cta", label: "Call to action" },
      { id: "footer", label: "Footer" },
    ],
  },
  {
    path: "/filters",
    title: "Filtering System",
    group: "Tools",
    sections: [
      { id: "header", label: "Header" },
      { id: "controls", label: "Analyze / Reset controls" },
      { id: "results", label: "Bot / human classification" },
      { id: "scoreboard", label: "Score breakdown" },
      { id: "info", label: "How it works" },
    ],
  },
  {
    path: "/admin",
    title: "Admin dashboard",
    group: "Private",
    sections: [
      { id: "summary", label: "Summary cards" },
      { id: "charts", label: "Traffic charts" },
      { id: "structure", label: "Web structure" },
    ],
  },
  {
    path: "/admin/login",
    title: "Admin sign in",
    group: "Private",
    sections: [{ id: "form", label: "Credentials form" }],
  },
];
