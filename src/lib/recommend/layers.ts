// Internal layer-based model. The engine picks abstract layer "kinds"
// first, then a separate mapping step turns them into WardrobeSlug items.
// This makes future substitutions and an insulation model easy to add.

export type BaseKind =
  | "diaper_only"
  | "sleeveless"
  | "short_sleeve"
  | "long_sleeve"
  | "pajamas_light"
  | "pajamas";

export type BottomKind = "none" | "shorts" | "pants" | "leggings";
export type MidKind = "none" | "sweater" | "fleece";
export type OuterKind = "none" | "winter_overall";

export type HatKind = "none" | "sun" | "thin" | "warm";
export type SockKind = "none" | "cotton" | "wool";

export type LayerNeed = {
  base: BaseKind;
  bottom: BottomKind;
  mid: MidKind;
  outer: OuterKind;
};

export type AccessoryNeed = {
  hat: HatKind;
  socks: SockKind;
  mittens: boolean;
};

// Rough clo-style warmth values. Not yet consumed by decision logic —
// wired here so a future engine can sum warmth vs. a target instead of
// nesting temperature checks.
export const LAYER_WARMTH: Record<string, number> = {
  diaper_only: 0.0,
  sleeveless: 0.15,
  short_sleeve: 0.2,
  long_sleeve: 0.3,
  pajamas_light: 0.35,
  pajamas: 0.5,

  shorts: 0.1,
  pants: 0.2,
  leggings: 0.25,

  sweater: 0.35,
  fleece: 0.5,

  winter_overall: 1.2,

  thin_hat: 0.05,
  warm_hat: 0.15,
  cotton_socks: 0.05,
  wool_socks: 0.15,
  mittens: 0.1,
};
