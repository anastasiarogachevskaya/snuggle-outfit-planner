import { LABEL_BY_SLUG, type WardrobeSlug } from "../wardrobe-catalog";
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
  leggings: { slugs: ["leggings", "wool_leggings", "tights", "pants"], label: "Leggings" },
};

const MID_MAP: Record<MidKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  sweater: { slugs: ["sweater", "cardigan", "hoodie"], label: "Sweater" },
  fleece: {
    slugs: ["fleece_overall", "fleece_layer", "wool_overall", "wool_layer", "sweater"],
    label: "Fleece overall",
  },
};

const OUTER_MAP: Record<OuterKind, { slugs: WardrobeSlug[]; label: string } | null> = {
  none: null,
  winter_overall: { slugs: ["winter_overall"], label: "Winter overall" },
};

/**
 * A jacket worn with snow pants covers the same ground as a one-piece winter
 * overall, so a parent who owns the two-piece version shouldn't be told their
 * outer layer is missing. Deliberately requires *both*: a jacket on its own
 * leaves the legs in whatever the bottom layer is, which is not equivalent.
 */
const OUTER_COMBOS: { kind: OuterKind; slugs: WardrobeSlug[] }[] = [
  { kind: "winter_overall", slugs: ["jacket", "snow_pants"] },
];

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
): { slug: WardrobeSlug; label: string; owned: boolean; usingLabel?: string } | null {
  if (!entry) return null;
  for (const s of entry.slugs) {
    if (!owned.has(s)) continue;
    // The label keeps naming the layer kind, but when the match is a stand-in
    // rather than the item itself, the real garment is carried alongside it —
    // otherwise the screen claims a "Sleeveless bodysuit" is in a wardrobe
    // that only holds a short-sleeve one.
    const actual = LABEL_BY_SLUG[s];
    const substituted = s !== entry.slugs[0] && actual !== undefined && actual !== entry.label;
    return {
      slug: s,
      label: entry.label,
      owned: true,
      ...(substituted ? { usingLabel: actual } : {}),
    };
  }
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

  type Picked = NonNullable<ReturnType<typeof pickSlug>>;
  const addLayer = (slot: Layer["slot"], p: Picked) => {
    baby.push({
      slot,
      slug: p.slug,
      label: p.label,
      ...(p.usingLabel ? { usingLabel: p.usingLabel } : {}),
    });
    if (!p.owned) missing.push(p.slug);
  };
  const addAccessory = (p: Picked) => {
    accs.push({
      slug: p.slug,
      label: p.label,
      ...(p.usingLabel ? { usingLabel: p.usingLabel } : {}),
    });
    if (!p.owned) missing.push(p.slug);
  };

  // Base
  if (layers.base === "diaper_only") {
    baby.push({ slot: "base", slug: "diaper_only", label: "Diaper only" });
  } else {
    const b = pickSlug(BASE_MAP[layers.base], owned);
    if (b) addLayer("base", b);
  }

  const bottom = pickSlug(BOTTOM_MAP[layers.bottom], owned);
  if (bottom) addLayer("bottom", bottom);

  const mid = pickSlug(MID_MAP[layers.mid], owned);
  if (mid) addLayer("mid", mid);

  const outerEntry = OUTER_MAP[layers.outer];
  const combo = OUTER_COMBOS.find(
    (c) => c.kind === layers.outer && c.slugs.every((s) => owned.has(s)),
  );
  if (outerEntry && combo && !outerEntry.slugs.some((s) => owned.has(s))) {
    // Two-piece stand-in: list both garments rather than one row claiming to
    // be the overall the parent doesn't have.
    for (const s of combo.slugs) {
      baby.push({ slot: "outer", slug: s, label: LABEL_BY_SLUG[s] ?? s });
    }
  } else {
    const outer = pickSlug(outerEntry, owned);
    if (outer) addLayer("outer", outer);
  }

  const hat = pickSlug(HAT_MAP[accessories.hat], owned);
  if (hat) addAccessory(hat);

  const socks = pickSlug(SOCK_MAP[accessories.socks], owned);
  if (socks) addAccessory(socks);
  if (accessories.mittens) {
    const m: WardrobeSlug = "mittens";
    accs.push({ slug: m, label: "Mittens" });
    if (!owned.has(m)) missing.push(m);
  }

  return { babyClothing: baby, accessories: accs, missing };
}
