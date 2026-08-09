// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { SITE_URL, OG_IMAGE, PUBLIC_ROUTES, pageMeta, breadcrumbLd } from "../seo";

type MetaTag = { title?: string; name?: string; property?: string; content?: string };

const find = (meta: MetaTag[], key: "name" | "property", value: string) =>
  meta.find((m) => m[key] === value)?.content;

describe("pageMeta", () => {
  const result = pageMeta({
    title: "Layerly — FAQ",
    description: "Answers about dressing your baby for the weather.",
    path: "/faq",
  });
  const meta = result.meta as MetaTag[];

  it("emits a self-referencing canonical link", () => {
    expect(result.links).toEqual([{ rel: "canonical", href: `${SITE_URL}/faq` }]);
    expect(find(meta, "property", "og:url")).toBe(`${SITE_URL}/faq`);
  });

  it("mirrors title and description into OG and Twitter tags", () => {
    expect(meta[0].title).toBe("Layerly — FAQ");
    expect(find(meta, "name", "description")).toBe("Answers about dressing your baby for the weather.");
    expect(find(meta, "property", "og:title")).toBe("Layerly — FAQ");
    expect(find(meta, "name", "twitter:title")).toBe("Layerly — FAQ");
    expect(find(meta, "property", "og:description")).toBe(
      "Answers about dressing your baby for the weather.",
    );
    expect(find(meta, "name", "twitter:description")).toBe(
      "Answers about dressing your baby for the weather.",
    );
  });

  it("uses an absolute https image for both previews and a large card", () => {
    expect(find(meta, "property", "og:image")).toBe(OG_IMAGE);
    expect(find(meta, "name", "twitter:image")).toBe(OG_IMAGE);
    expect(OG_IMAGE.startsWith("https://")).toBe(true);
    expect(find(meta, "name", "twitter:card")).toBe("summary_large_image");
  });

  it("defaults og:type to website and honours an override", () => {
    expect(find(meta, "property", "og:type")).toBe("website");
    const article = pageMeta({
      title: "T",
      description: "D",
      path: "/guide/baby-layering",
      type: "article",
    }).meta as MetaTag[];
    expect(find(article, "property", "og:type")).toBe("article");
  });
});

describe("PUBLIC_ROUTES", () => {
  it("are root-relative, unique, and include the home page", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/");
    for (const p of paths) expect({ p, ok: p.startsWith("/") }).toEqual({ p, ok: true });
  });

  it("have a valid priority and changefreq", () => {
    const freqs = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
    for (const r of PUBLIC_ROUTES) {
      const priority = Number(r.priority);
      expect({ path: r.path, ok: priority >= 0 && priority <= 1 }).toEqual({ path: r.path, ok: true });
      expect(freqs).toContain(r.changefreq);
    }
  });
});

describe("breadcrumbLd", () => {
  it("builds a schema.org BreadcrumbList with absolute, 1-based items", () => {
    const ld = breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "FAQ", path: "/faq" },
    ]);
    expect(ld.type).toBe("application/ld+json");
    const parsed = JSON.parse(ld.children);
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "FAQ", item: `${SITE_URL}/faq` },
    ]);
  });
});
