export const SITE_URL = "https://layerly.online";

export const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d945aa4-20b5-4f76-8234-267df2c9f2f6/id-preview-558ba17c--61d18b02-2730-4e31-9318-73112e9e585a.lovable.app-1783767349149.png";

/** Public, indexable routes included in sitemap.xml. */
export const PUBLIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/try", changefreq: "weekly", priority: "0.9" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/guide/baby-layering", changefreq: "monthly", priority: "0.8" },
  { path: "/guide/stroller-walks", changefreq: "monthly", priority: "0.8" },
  { path: "/web-app", changefreq: "monthly", priority: "0.6" },
  { path: "/ios", changefreq: "monthly", priority: "0.6" },
  { path: "/android", changefreq: "monthly", priority: "0.6" },
  { path: "/auth", changefreq: "monthly", priority: "0.4" },
];

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  type?: string;
}) {
  const url = `${SITE_URL}${opts.path}`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: opts.type ?? "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    }),
  };
}
