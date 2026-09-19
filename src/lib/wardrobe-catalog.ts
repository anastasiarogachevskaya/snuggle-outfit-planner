export type WardrobeSlug =
  // Base
  | "sleeveless_bodysuit"
  | "short_sleeve_bodysuit"
  | "long_sleeve_bodysuit"
  | "romper"
  | "pajamas"
  // Bottoms
  | "pants"
  | "leggings"
  | "tights"
  | "wool_leggings"
  | "shorts"
  // Mid
  | "sweater"
  | "light_merino_layer"
  | "fleece_layer"
  | "wool_layer"
  | "cardigan"
  | "hoodie"
  // Outer
  | "light_overall"
  | "fleece_overall"
  | "wool_overall"
  | "softshell_overall"
  | "rain_overall"
  | "winter_overall"
  | "jacket"
  | "snow_pants"
  // Accessories
  | "thin_hat"
  | "warm_hat"
  | "sun_hat"
  | "balaclava"
  | "mittens"
  | "cotton_socks"
  | "wool_socks"
  | "booties"
  | "winter_boots"
  | "neck_warmer"
  // Sleep
  | "sleep_sack_05"
  | "sleep_sack_10"
  | "sleep_sack_25"
  | "sleep_sack_35"
  | "swaddle"
  // Transport
  | "stroller"
  | "footmuff"
  | "blanket"
  | "rain_cover"
  | "baby_carrier"
  | "babywearing_cover"
  | "car_seat_blanket";

export type WardrobeStep = {
  id: string;
  title: string;
  question: string;
  items: WardrobeItem[];
};

export type WardrobeWarmth = "Light" | "Medium" | "Warm" | "Very warm";

export type WardrobeItem = {
  slug: WardrobeSlug;
  label: string;
  hint: string;
  emoji: string;
  warmth?: WardrobeWarmth;
  explanation?: string;
};

export const WARDROBE_STEPS: WardrobeStep[] = [
  {
    id: "base",
    title: "Base layers",
    question: "Which bodysuits do you have?",
    items: [
      {
        slug: "sleeveless_bodysuit",
        label: "Sleeveless bodysuit",
        hint: "No sleeves, worn next to skin",
        emoji: "🎽",
        warmth: "Light",
      },
      {
        slug: "short_sleeve_bodysuit",
        label: "Short-sleeve bodysuit",
        hint: "Short sleeves, worn next to skin",
        emoji: "👕",
        warmth: "Light",
      },
      {
        slug: "long_sleeve_bodysuit",
        label: "Long-sleeve bodysuit",
        hint: "Long sleeves, worn next to skin",
        emoji: "👶",
        warmth: "Medium",
      },
      { slug: "romper", label: "Romper", hint: "One piece that covers the legs", emoji: "🧸", warmth: "Light" },
      { slug: "pajamas", label: "Pajamas / sleepsuit", hint: "Long one-piece sleepwear", emoji: "🌙", warmth: "Medium" },
    ],
  },
  {
    id: "bottoms",
    title: "Bottoms",
    question: "Which bottoms do you have?",
    items: [
      { slug: "pants", label: "Pants", hint: "Everyday cotton bottoms", emoji: "👖", warmth: "Medium" },
      { slug: "leggings", label: "Leggings", hint: "Close-fitting everyday bottoms", emoji: "🧦", warmth: "Medium" },
      { slug: "tights", label: "Tights", hint: "Thin fitted bottoms with feet", emoji: "🩱", warmth: "Light" },
      { slug: "wool_leggings", label: "Wool leggings", hint: "Thicker wool bottoms", emoji: "🐑", warmth: "Warm" },
      { slug: "shorts", label: "Shorts", hint: "Bare lower legs", emoji: "🩳", warmth: "Light" },
    ],
  },
  {
    id: "mid",
    title: "Mid layers",
    question: "Which mid layers do you have?",
    items: [
      {
        slug: "sweater",
        label: "Sweater",
        hint: "Everyday knitted top",
        emoji: "🧶",
        warmth: "Medium",
      },
      {
        slug: "light_merino_layer",
        label: "Light merino layer",
        hint: "Thin, smooth merino jersey",
        emoji: "🐑",
        warmth: "Light",
        explanation: "A separate thin top or suit worn over a bodysuit—not a merino bodysuit itself.",
      },
      {
        slug: "fleece_layer",
        label: "Fleece layer",
        hint: "Soft, fluffy fleece",
        emoji: "🧥",
        warmth: "Warm",
      },
      {
        slug: "wool_layer",
        label: "Warm wool layer",
        hint: "Thick knit or boiled wool",
        emoji: "🐏",
        warmth: "Warm",
        explanation: "A chunky knit or dense boiled-wool layer, similar in warmth to fleece.",
      },
      {
        slug: "cardigan",
        label: "Cardigan",
        hint: "Buttoned knitted top",
        emoji: "👚",
        warmth: "Medium",
      },
      {
        slug: "hoodie",
        label: "Hoodie",
        hint: "Cotton sweatshirt",
        emoji: "🎽",
        warmth: "Medium",
      },
    ],
  },
  {
    id: "outer",
    title: "Outerwear",
    question: "Which outerwear do you have?",
    items: [
      { slug: "light_overall", label: "Light overall", hint: "Unpadded spring or autumn suit", emoji: "🧣", warmth: "Medium" },
      { slug: "fleece_overall", label: "Fleece overall", hint: "Soft, fluffy one-piece layer", emoji: "🧸", warmth: "Warm" },
      { slug: "wool_overall", label: "Wool overall", hint: "Thick wool one-piece layer", emoji: "🐑", warmth: "Warm" },
      { slug: "softshell_overall", label: "Softshell overall", hint: "Blocks wind and light rain", emoji: "💧", warmth: "Warm" },
      { slug: "rain_overall", label: "Rain overall", hint: "Waterproof shell without padding", emoji: "☔", warmth: "Light" },
      { slug: "winter_overall", label: "Winter overall", hint: "Insulated suit for cold weather", emoji: "❄️", warmth: "Very warm" },
      { slug: "jacket", label: "Jacket", hint: "Warm outer layer for the upper body", emoji: "🧥", warmth: "Warm" },
      { slug: "snow_pants", label: "Rain / snow pants", hint: "Protective outer bottoms", emoji: "🌨️", warmth: "Warm" },
    ],
  },
  {
    id: "accessories",
    title: "Accessories",
    question: "Which accessories do you have?",
    items: [
      { slug: "thin_hat", label: "Thin hat", hint: "Single-layer cotton jersey", emoji: "🧢", warmth: "Light" },
      { slug: "warm_hat", label: "Warm hat", hint: "Thick wool or fleece", emoji: "🎩", warmth: "Warm" },
      { slug: "sun_hat", label: "Sun hat", hint: "Brim for shade", emoji: "👒" },
      { slug: "balaclava", label: "Balaclava", hint: "Covers head, ears and neck", emoji: "🥶", warmth: "Very warm" },
      { slug: "mittens", label: "Mittens", hint: "Insulated hand covering", emoji: "🧤", warmth: "Warm" },
      { slug: "cotton_socks", label: "Cotton socks", hint: "Thin everyday socks", emoji: "🧦", warmth: "Light" },
      { slug: "wool_socks", label: "Wool socks", hint: "Thick insulating socks", emoji: "🧦", warmth: "Warm" },
      { slug: "booties", label: "Booties", hint: "Soft shoes", emoji: "👟" },
      { slug: "winter_boots", label: "Winter boots", hint: "For snow", emoji: "🥾" },
      { slug: "neck_warmer", label: "Neck warmer", hint: "Scarf alternative", emoji: "🧣" },
    ],
  },
  {
    id: "sleep",
    title: "Sleep",
    question: "What does baby sleep in?",
    items: [
      {
        slug: "sleep_sack_05",
        label: "Sleep sack (0.5 TOG)",
        hint: "Very warm rooms 24–26°C",
        emoji: "🌙",
      },
      {
        slug: "sleep_sack_10",
        label: "Sleep sack (1.0 TOG)",
        hint: "Warm rooms 20–23°C",
        emoji: "🌙",
      },
      {
        slug: "sleep_sack_25",
        label: "Sleep sack (2.5 TOG)",
        hint: "Cool rooms 16–19°C",
        emoji: "🛌",
      },
      {
        slug: "sleep_sack_35",
        label: "Sleep sack (3.5 TOG)",
        hint: "Cold rooms below 16°C",
        emoji: "🛌",
      },
      { slug: "swaddle", label: "Swaddle", hint: "Newborn", emoji: "👶" },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    question: "How do you get around?",
    items: [
      { slug: "stroller", label: "Stroller", hint: "Transport", emoji: "🛒" },
      { slug: "footmuff", label: "Footmuff", hint: "For stroller", emoji: "🛏️" },
      { slug: "blanket", label: "Blanket", hint: "Extra warmth", emoji: "🛌" },
      { slug: "rain_cover", label: "Rain cover", hint: "For stroller", emoji: "☂️" },
      { slug: "baby_carrier", label: "Baby carrier", hint: "Babywearing", emoji: "👶" },
      { slug: "babywearing_cover", label: "Babywearing cover", hint: "Warmth", emoji: "🧥" },
      { slug: "car_seat_blanket", label: "Car seat blanket", hint: "For the car", emoji: "🚗" },
    ],
  },
];

export const WARDROBE_CATALOG = WARDROBE_STEPS.flatMap((s) =>
  s.items.map((i) => ({ ...i, group: s.title })),
);

export const ITEM_BY_SLUG: Record<WardrobeSlug, WardrobeItem> = Object.fromEntries(
  WARDROBE_STEPS.flatMap((s) => s.items).map((i) => [i.slug, i]),
) as Record<WardrobeSlug, WardrobeItem>;

export const LABEL_BY_SLUG: Record<WardrobeSlug, string> = Object.fromEntries(
  WARDROBE_STEPS.flatMap((s) => s.items).map((i) => [i.slug, i.label]),
) as Record<WardrobeSlug, string>;

// Quick-setup starter set: common basics most parents own
export const QUICK_SETUP_OWNED: WardrobeSlug[] = [
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
  "pajamas",
  "pants",
  "leggings",
  "sweater",
  "thin_hat",
  "warm_hat",
  "cotton_socks",
  "wool_socks",
  "stroller",
];

// Minimum defaults if user skips onboarding entirely
export const DEFAULT_OWNED: WardrobeSlug[] = QUICK_SETUP_OWNED;

/**
 * Tailwind class pair for a warmth tag so Light/Medium/Warm/Very warm are
 * visually distinct but still soft against Layerly's canvas.
 */
export function warmthTagClasses(warmth: WardrobeWarmth): string {
  switch (warmth) {
    case "Light":
      return "bg-warmth-light-bg text-warmth-light";
    case "Medium":
      return "bg-warmth-medium-bg text-warmth-medium";
    case "Warm":
      return "bg-warmth-warm-bg text-warmth-warm";
    case "Very warm":
      return "bg-warmth-very-warm-bg text-warmth-very-warm";
  }
}
