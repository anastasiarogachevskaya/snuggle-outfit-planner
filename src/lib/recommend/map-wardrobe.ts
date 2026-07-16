import type { WardrobeSlug } from "../wardrobe-catalog";
import type { Layer, Accessory } from "../recommend";
import type {
  LayerNeed,
  AccessoryNeed,
  BaseKind,
  BottomKind,
  MidKind,
  OuterKind,
  HatKind,
  SockKind,
} from "./layers";

// Ordered fallback lists — first match in `owned` wins.
const BASE_MAP: Record<BaseKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  diaper_only: null,
  sleeveless: { slugs: ["sleeveless_bodysuit", "short_sleeve_bodysuit"], label: "Sleeveless bodysuit" },
  short_sleeve: { slugs: ["short_sleeve_bodysuit", "sleeveless_bodysuit"], label: "Short-sleeve bodysuit" },
  long_sleeve: { slugs: ["long_sleeve_bodysuit"], label: "Long-sleeve bodysuit" },
  pajamas_light: { slugs: ["pajamas"], label: "Lightweight pajamas" },
  pajamas: { slugs: ["pajamas"], label: "Long-sleeve pajamas" },
};

const BOTTOM_MAP: Record<BottomKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  shorts: { slugs: ["shorts", "pants"], label: "Shorts" },
  pants: { slugs: ["pants", "leggings"], label: "Pants" },
  leggings: { slugs: ["leggings", "wool_leggings", "pants"], label: "Leggings" },
};

const MID_MAP: Record<MidKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  sweater: { slugs: ["sweater", "cardigan", "hoodie"], label: "Sweater" },
  fleece: { slugs: ["fleece_overall", "fleece_layer", "wool_layer", "sweater"], label: "Fleece overall" },
};

const OUTER_MAP: Record<OuterKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  winter_overall: { slugs: ["winter_overall"], label: "Winter overall" },
};

const HAT_MAP: Record<HatKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  sun: { slugs: ["sun_hat"], label: "Sun hat" },
  thin: { slugs: ["thin_hat", "warm_hat"], label: "Thin cotton hat" },
  warm: { slugs: ["warm_hat", "balaclava"], label: "Warm hat" },
};

const SOCK_MAP: Record<SockKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  cotton: { slugs: ["cotton_socks", "wool_socks"], label: "Cotton socks" },
  wool: { slugs: ["wool_socks", "cotton_socks"], label: "Warm socks" },
};

function pickSlug(
  entry: { slugs: WardrobeSlug[]; label: string } | null,
  owned: Set<WardrobeSlug>,
): { slug: WardrobeSlug; label: string; owned: boolean } | null {
  if (!entry) return null;
  for (const s of entry.slugs) if (owned.has(s)) return { slug: s, label: entry.label, owned: true };
  // Nothing owned — use the primary as the "missing" recommendation.
  return { slug: entry.slugs[0], label: entry.label, owned: false };
}

export type MappedOutput = {
  babyClothing: Layer[];
  accessories: Accessory[];
  missing: WardrobeSlug[];
};

export function mapWardrobe(
  layers: LayerNeed,
  accessories: AccessoryNeed,
  owned: Set<WardrobeSlug>,
): MappedOutput {
  const baby: Layer[] = [];
  const accs: Accessory[] = [];
  const missing: WardrobeSlug[] = [];

  // Base
  if (layers.base === "diaper_only") {
    baby.push({ slot: "base", slug: "diaper_only", label: "Diaper only" });
  } else {
    const b = pickSlug(BASE_MAP[layers.base], owned);
    if (b) {
      baby.push({ slot: "base", slug: b.slug, label: b.label });
      if (!b.owned) missing.push(b.slug);
    }
  }

  const bottom = pickSlug(BOTTOM_MAP[layers.bottom], owned);
  if (bottom) {
    baby.push({ slot: "bottom", slug: bottom.slug, label: bottom.label });
    if (!bottom.owned) missing.push(bottom.slug);
  }

  const mid = pickSlug(MID_MAP[layers.mid], owned);
  if (mid) {
    baby.push({ slot: "mid", slug: mid.slug, label: mid.label });
    if (!mid.owned) missing.push(mid.slug);
  }

  const outer = pickSlug(OUTER_MAP[layers.outer], owned);
  if (outer) {
    baby.push({ slot: "outer", slug: outer.slug, label: outer.label });
    if (!outer.owned) missing.push(outer.slug);
  }

  const hat = pickSlug(HAT_MAP[accessories.hat], owned);
  if (hat) {
    accs.push({ slug: hat.slug, label: hat.label });
    if (!hat.owned) missing.push(hat.slug);
  }
  const socks = pickSlug(SOCK_MAP[accessories.socks], owned);
  if (socks) {
    accs.push({ slug: socks.slug, label: socks.label });
    if (!socks.owned) missing.push(socks.slug);
  }
  if (accessories.mittens) {
    const m: WardrobeSlug = "mittens";
    accs.push({ slug: m, label: "Mittens" });
    if (!owned.has(m)) missing.push(m);
  }

  return { babyClothing: baby, accessories: accs, missing };
}
