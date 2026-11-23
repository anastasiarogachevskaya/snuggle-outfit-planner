/**
 * Shared clothing-needs model (T11).
 *
 * Describes what a child wears by *role* and *body coverage*, independently,
 * so later rules can stack thermal underlayers, everyday clothing, insulating
 * layers and outer weather protection on the same body area instead of
 * competing for one "bottoms" slot.
 *
 *   - Coverage says which body areas a garment touches. It is not proof of
 *     warmth or waterproofing.
 *   - Protection (insulation, waterproof) comes only from what the parent
 *     stated in garment details; otherwise it stays "unknown". It is never
 *     taken from the slug, the name or the catalogue warmth tag (a legacy
 *     "Rain / snow pants" row is not assumed insulated or waterproof).
 *   - A garment covering several areas (romper, overall, pajamas) is one
 *     entry with all its areas attached, so it's never listed or counted twice.
 *   - Socks and footwear are separate roles.
 *   - Transport equipment (stroller, footmuff, rain cover, …) is never worn
 *     clothing and lives in its own list.
 *
 * This module adds no selection policy. The compatibility adapters below
 * describe an existing Recommendation in this model and turn it back into
 * exactly the same Recommendation.
 */
import type { Accessory, Layer, OptionalAccessory, Recommendation } from "./recommend";
import {
  DEFAULT_GARMENT_DETAILS,
  type GarmentDetails,
} from "./garment-details";
import type { WardrobeSlug } from "./wardrobe-catalog";
import type { EligibleWardrobe, SetAsideReason } from "./wardrobe-eligibility";

export const BODY_AREAS = ["head", "neck", "upper_body", "lower_body", "hands", "feet"] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

export type ClothingRole =
  | "thermal" // thermal underlayer, next to skin under everyday clothes
  | "everyday" // bodysuits, tops, rompers, pants, leggings, shorts…
  | "sleepwear"
  | "insulating" // mid layers worn for warmth (sweater, fleece…)
  | "outerwear" // outermost clothing; protection is a separate property
  | "sleep_bag" // sleep sacks and swaddles
  | "headwear"
  | "neckwear"
  | "handwear"
  | "socks"
  | "footwear";

/** Inside-to-outside order of roles on the same body area. */
export const LAYER_ORDER: Record<ClothingRole | "nappy", number> = {
  nappy: 0,
  thermal: 1,
  socks: 1,
  headwear: 1,
  neckwear: 1,
  handwear: 1,
  everyday: 2,
  sleepwear: 2,
  footwear: 2,
  insulating: 3,
  outerwear: 4,
  sleep_bag: 5,
};

export type WornProfile = { role: ClothingRole; coverage: readonly BodyArea[] };

const UL = ["upper_body", "lower_body"] as const;
const U = ["upper_body"] as const;
const L = ["lower_body"] as const;

/**
 * Catalogue facts about each worn garment type. `null` marks transport
 * equipment. Pajamas get feet only when the parent says they're footed;
 * tights are defined by the catalogue as having feet.
 */
const PROFILES: Record<WardrobeSlug, WornProfile | null> = {
  sleeveless_bodysuit: { role: "everyday", coverage: U },
  short_sleeve_bodysuit: { role: "everyday", coverage: U },
  long_sleeve_bodysuit: { role: "everyday", coverage: U },
  romper: { role: "everyday", coverage: UL },
  pajamas: { role: "sleepwear", coverage: UL },
  short_sleeve_top: { role: "everyday", coverage: U },
  long_sleeve_top: { role: "everyday", coverage: U },
  thermal_top: { role: "thermal", coverage: U },

  pants: { role: "everyday", coverage: L },
  leggings: { role: "everyday", coverage: L },
  tights: { role: "everyday", coverage: ["lower_body", "feet"] },
  wool_leggings: { role: "everyday", coverage: L },
  shorts: { role: "everyday", coverage: L },
  thermal_bottom: { role: "thermal", coverage: L },

  sweater: { role: "insulating", coverage: U },
  light_merino_layer: { role: "insulating", coverage: U },
  fleece_layer: { role: "insulating", coverage: U },
  wool_layer: { role: "insulating", coverage: U },
  cardigan: { role: "insulating", coverage: U },
  hoodie: { role: "insulating", coverage: U },

  fleece_overall: { role: "insulating", coverage: UL },
  wool_overall: { role: "insulating", coverage: UL },
  light_overall: { role: "outerwear", coverage: UL },
  softshell_overall: { role: "outerwear", coverage: UL },
  rain_overall: { role: "outerwear", coverage: UL },
  winter_overall: { role: "outerwear", coverage: UL },
  jacket: { role: "outerwear", coverage: U },
  snow_pants: { role: "outerwear", coverage: L },
  waterproof_jacket: { role: "outerwear", coverage: U },
  rain_pants: { role: "outerwear", coverage: L },

  thin_hat: { role: "headwear", coverage: ["head"] },
  warm_hat: { role: "headwear", coverage: ["head"] },
  sun_hat: { role: "headwear", coverage: ["head"] },
  balaclava: { role: "headwear", coverage: ["head", "neck"] },
  neck_warmer: { role: "neckwear", coverage: ["neck"] },
  mittens: { role: "handwear", coverage: ["hands"] },
  cotton_socks: { role: "socks", coverage: ["feet"] },
  wool_socks: { role: "socks", coverage: ["feet"] },
  booties: { role: "footwear", coverage: ["feet"] },
  winter_boots: { role: "footwear", coverage: ["feet"] },
  everyday_shoes: { role: "footwear", coverage: ["feet"] },
  rain_boots: { role: "footwear", coverage: ["feet"] },

  sleep_sack_05: { role: "sleep_bag", coverage: UL },
  sleep_sack_10: { role: "sleep_bag", coverage: UL },
  sleep_sack_25: { role: "sleep_bag", coverage: UL },
  sleep_sack_35: { role: "sleep_bag", coverage: UL },
  swaddle: { role: "sleep_bag", coverage: UL },

  stroller: null,
  footmuff: null,
  blanket: null,
  rain_cover: null,
  baby_carrier: null,
  babywearing_cover: null,
  car_seat_blanket: null,
};

export function isTransportEquipment(slug: string): boolean {
  return slug in PROFILES && PROFILES[slug as WardrobeSlug] === null;
}

/**
 * Role and coverage of a worn garment, refined only by what the parent
 * stated: footed pajamas also cover the feet, and wool leggings stated as a
 * thermal underlayer take the thermal role. Returns null for transport.
 */
export function wornProfile(
  slug: WardrobeSlug,
  details?: Partial<GarmentDetails>,
): WornProfile | null {
  const p = PROFILES[slug];
  if (!p) return null;
  if (slug === "pajamas" && details?.foot_coverage === "footed")
    return { role: p.role, coverage: [...p.coverage, "feet"] };
  if (slug === "wool_leggings" && details?.leggings_use === "thermal_base")
    return { role: "thermal", coverage: p.coverage };
  return p;
}

export type Protection = Pick<GarmentDetails, "insulation" | "waterproof">;
export const UNKNOWN_PROTECTION: Protection = {
  insulation: DEFAULT_GARMENT_DETAILS.insulation,
  waterproof: DEFAULT_GARMENT_DETAILS.waterproof,
};

/** Where an item sat in the legacy Recommendation, so the adapter is exact. */
export type WornPlacement =
  | { list: "babyClothing"; slot: Layer["slot"] }
  | { list: "accessories" }
  | { list: "sleepAccessories" }
  | { list: "missingHelpfulItems" };

export type WornStatus = "owned" | "missing" | "not_tracked";

export type WornGarment = {
  slug: WardrobeSlug | "diaper_only";
  label: string;
  usingLabel?: string;
  /** "nappy" is the display-only "Diaper only" marker, not a wardrobe item. */
  role: ClothingRole | "nappy";
  coverage: readonly BodyArea[];
  /** Parent-stated only; "unknown" otherwise. Unknown for missing items. */
  protection: Protection;
  status: WornStatus;
  /** Set when a missing item is owned but marked outgrown/unavailable. */
  setAside?: SetAsideReason;
  placement: WornPlacement;
};

export type TransportPlacement =
  | "transportExtras"
  | "optionalTransportExtras"
  | "missingHelpfulItems";

export type TransportItem = {
  slug: WardrobeSlug;
  label: string;
  usingLabel?: string;
  status: "owned" | "missing";
  setAside?: SetAsideReason;
  placement: TransportPlacement;
};

export type ClothingNeeds = {
  /** Clothing worn by the child — each garment once, with all its areas. */
  worn: WornGarment[];
  /** Transport equipment, never counted as clothing. */
  transport: TransportItem[];
};

type WardrobeFacts = Partial<Pick<EligibleWardrobe, "details" | "setAside">>;

/** Every worn garment touching `area`, inside to outside. */
export function layersOn(needs: Pick<ClothingNeeds, "worn">, area: BodyArea): WornGarment[] {
  return needs.worn
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.coverage.includes(area))
    .sort((a, b) => LAYER_ORDER[a.g.role] - LAYER_ORDER[b.g.role] || a.i - b.i)
    .map(({ g }) => g);
}

/** Describe one worn item from the catalogue and the parent's stated details. */
export function describeWorn(
  item: { slug: WardrobeSlug | "diaper_only"; label: string; usingLabel?: string },
  status: WornStatus,
  placement: WornPlacement,
  wardrobe: WardrobeFacts = {},
): WornGarment {
  const base = {
    slug: item.slug,
    label: item.label,
    ...(item.usingLabel ? { usingLabel: item.usingLabel } : {}),
  };
  if (item.slug === "diaper_only") {
    return {
      ...base,
      role: "nappy",
      coverage: [],
      protection: UNKNOWN_PROTECTION,
      status: "not_tracked",
      placement,
    };
  }
  const slug = item.slug;
  const saved = status === "owned" ? wardrobe.details?.get(slug) : undefined;
  const profile = wornProfile(slug, saved);
  if (!profile) throw new Error(`${slug} is transport equipment, not worn clothing`);
  const setAside = status === "missing" ? wardrobe.setAside?.get(slug) : undefined;
  return {
    ...base,
    role: profile.role,
    coverage: profile.coverage,
    protection: saved
      ? { insulation: saved.insulation, waterproof: saved.waterproof }
      : UNKNOWN_PROTECTION,
    status,
    ...(setAside ? { setAside } : {}),
    placement,
  };
}

function describeTransport(
  item: Accessory,
  status: TransportItem["status"],
  placement: TransportPlacement,
  wardrobe: WardrobeFacts,
): TransportItem {
  const setAside = status === "missing" ? wardrobe.setAside?.get(item.slug) : undefined;
  return {
    slug: item.slug,
    label: item.label,
    ...(item.usingLabel ? { usingLabel: item.usingLabel } : {}),
    status,
    ...(setAside ? { setAside } : {}),
    placement,
  };
}

// ---------------------------------------------------------------------------
// Compatibility adapters: Recommendation <-> ClothingNeeds
// ---------------------------------------------------------------------------

/**
 * Describe an existing Recommendation in the clothing-needs model. Pass the
 * same eligible wardrobe the recommendation was built from so stated details
 * and set-aside reasons are attached; nothing is chosen or changed here.
 */
export function clothingNeedsFromRecommendation(
  rec: Recommendation,
  wardrobe: WardrobeFacts = {},
): ClothingNeeds {
  const missing = new Set<string>(rec.missing);
  const worn: WornGarment[] = [];
  const transport: TransportItem[] = [];
  const statusOf = (slug: string): WornStatus => (missing.has(slug) ? "missing" : "owned");

  for (const l of rec.babyClothing)
    worn.push(describeWorn(l, statusOf(l.slug), { list: "babyClothing", slot: l.slot }, wardrobe));
  for (const a of rec.accessories)
    worn.push(describeWorn(a, statusOf(a.slug), { list: "accessories" }, wardrobe));
  for (const a of rec.sleepAccessories)
    worn.push(describeWorn(a, "owned", { list: "sleepAccessories" }, wardrobe));
  for (const a of rec.missingHelpfulItems) {
    if (isTransportEquipment(a.slug))
      transport.push(describeTransport(a, "missing", "missingHelpfulItems", wardrobe));
    else worn.push(describeWorn(a, "missing", { list: "missingHelpfulItems" }, wardrobe));
  }
  for (const a of rec.transportExtras)
    transport.push(describeTransport(a, "owned", "transportExtras", wardrobe));
  for (const a of rec.optionalTransportExtras)
    transport.push(
      describeTransport(a, a.owned ? "owned" : "missing", "optionalTransportExtras", wardrobe),
    );
  return { worn, transport };
}

type ClothingFields = Pick<
  Recommendation,
  | "babyClothing"
  | "accessories"
  | "sleepAccessories"
  | "transportExtras"
  | "optionalTransportExtras"
  | "missingHelpfulItems"
  | "missing"
>;

function toAccessory(i: { slug: WardrobeSlug; label: string; usingLabel?: string }): Accessory {
  return { slug: i.slug, label: i.label, ...(i.usingLabel ? { usingLabel: i.usingLabel } : {}) };
}

/** The legacy Recommendation clothing fields for a ClothingNeeds. */
export function recommendationClothing(needs: ClothingNeeds): ClothingFields {
  const out: ClothingFields = {
    babyClothing: [],
    accessories: [],
    sleepAccessories: [],
    transportExtras: [],
    optionalTransportExtras: [],
    missingHelpfulItems: [],
    missing: [],
  };
  // `missing` lists clothing before accessories, as mapWardrobe builds it.
  const clothingMissing: WardrobeSlug[] = [];
  const accessoryMissing: WardrobeSlug[] = [];
  for (const g of needs.worn) {
    const p = g.placement;
    if (p.list === "babyClothing") {
      out.babyClothing.push({
        slot: p.slot,
        slug: g.slug,
        label: g.label,
        ...(g.usingLabel ? { usingLabel: g.usingLabel } : {}),
      });
      if (g.status === "missing" && g.slug !== "diaper_only") clothingMissing.push(g.slug);
      continue;
    }
    if (g.slug === "diaper_only") continue;
    const acc = toAccessory({ ...g, slug: g.slug });
    if (p.list === "accessories") {
      out.accessories.push(acc);
      if (g.status === "missing") accessoryMissing.push(g.slug);
    } else if (p.list === "sleepAccessories") out.sleepAccessories.push(acc);
    else out.missingHelpfulItems.push(acc);
  }
  out.missing = [...clothingMissing, ...accessoryMissing];
  for (const t of needs.transport) {
    const acc = toAccessory(t);
    if (t.placement === "transportExtras") out.transportExtras.push(acc);
    else if (t.placement === "missingHelpfulItems") out.missingHelpfulItems.push(acc);
    else {
      const opt: OptionalAccessory = { ...acc, owned: t.status === "owned" };
      out.optionalTransportExtras.push(opt);
    }
  }
  return out;
}

/** A Recommendation whose clothing comes from `needs`; explanations are kept. */
export function withClothingNeeds(rec: Recommendation, needs: ClothingNeeds): Recommendation {
  return { ...rec, ...recommendationClothing(needs) };
}
