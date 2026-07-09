export type WardrobeSlug =
  | "short_sleeve_bodysuit"
  | "long_sleeve_bodysuit"
  | "tshirt"
  | "pants"
  | "leggings"
  | "sweater"
  | "fleece_overall"
  | "winter_overall"
  | "rain_suit"
  | "hat"
  | "thin_hat"
  | "wool_hat"
  | "mittens"
  | "wool_socks"
  | "blanket"
  | "footmuff"
  | "baby_carrier"
  | "stroller";

export const WARDROBE_CATALOG: { slug: WardrobeSlug; label: string; group: string }[] = [
  { slug: "short_sleeve_bodysuit", label: "Short-sleeve bodysuit", group: "Base" },
  { slug: "long_sleeve_bodysuit", label: "Long-sleeve bodysuit", group: "Base" },
  { slug: "tshirt", label: "T-shirt", group: "Base" },
  { slug: "pants", label: "Pants", group: "Bottom" },
  { slug: "leggings", label: "Leggings", group: "Bottom" },
  { slug: "sweater", label: "Sweater", group: "Mid" },
  { slug: "fleece_overall", label: "Fleece overall", group: "Mid" },
  { slug: "winter_overall", label: "Winter overall", group: "Outer" },
  { slug: "rain_suit", label: "Rain suit", group: "Outer" },
  { slug: "hat", label: "Sun hat", group: "Head" },
  { slug: "thin_hat", label: "Thin cotton hat", group: "Head" },
  { slug: "wool_hat", label: "Wool hat", group: "Head" },
  { slug: "mittens", label: "Mittens", group: "Extras" },
  { slug: "wool_socks", label: "Wool socks", group: "Extras" },
  { slug: "blanket", label: "Blanket", group: "Extras" },
  { slug: "footmuff", label: "Footmuff", group: "Gear" },
  { slug: "baby_carrier", label: "Baby carrier", group: "Gear" },
  { slug: "stroller", label: "Stroller", group: "Gear" },
];

export const LABEL_BY_SLUG: Record<WardrobeSlug, string> = Object.fromEntries(
  WARDROBE_CATALOG.map((i) => [i.slug, i.label]),
) as Record<WardrobeSlug, string>;

export const DEFAULT_OWNED: WardrobeSlug[] = [
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
  "pants",
  "leggings",
  "sweater",
  "fleece_overall",
  "thin_hat",
  "wool_hat",
  "wool_socks",
  "blanket",
  "stroller",
];
