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
  items: { slug: WardrobeSlug; label: string; hint: string; emoji: string }[];
};

export const WARDROBE_STEPS: WardrobeStep[] = [
  {
    id: "base",
    title: "Base layers",
    question: "Which bodysuits do you have?",
    items: [
      { slug: "sleeveless_bodysuit", label: "Sleeveless bodysuit", hint: "Base layer", emoji: "🎽" },
      { slug: "short_sleeve_bodysuit", label: "Short-sleeve bodysuit", hint: "Base layer", emoji: "👕" },
      { slug: "long_sleeve_bodysuit", label: "Long-sleeve bodysuit", hint: "Base layer", emoji: "👶" },
      { slug: "romper", label: "Romper", hint: "One piece, covers legs", emoji: "🧸" },
      { slug: "pajamas", label: "Pajamas / sleepsuit", hint: "Base layer", emoji: "🌙" },
    ],
  },
  {
    id: "bottoms",
    title: "Bottoms",
    question: "Which bottoms do you have?",
    items: [
      { slug: "pants", label: "Pants", hint: "Bottom", emoji: "👖" },
      { slug: "leggings", label: "Leggings", hint: "Bottom", emoji: "🧦" },
      { slug: "tights", label: "Tights", hint: "Bottom", emoji: "🩱" },
      { slug: "wool_leggings", label: "Wool leggings", hint: "Warm bottom", emoji: "🐑" },
      { slug: "shorts", label: "Shorts", hint: "Summer bottom", emoji: "🩳" },
    ],
  },
  {
    id: "mid",
    title: "Mid layers",
    question: "Which mid layers do you have?",
    items: [
      { slug: "sweater", label: "Sweater", hint: "Mid layer", emoji: "🧶" },
      { slug: "fleece_layer", label: "Fleece layer", hint: "Warm mid", emoji: "🧥" },
      { slug: "wool_layer", label: "Wool layer", hint: "Warm mid", emoji: "🐏" },
      { slug: "cardigan", label: "Cardigan", hint: "Mid layer", emoji: "👚" },
      { slug: "hoodie", label: "Hoodie", hint: "Mid layer", emoji: "🎽" },
    ],
  },
  {
    id: "outer",
    title: "Outerwear",
    question: "Which outerwear do you have?",
    items: [
      { slug: "light_overall", label: "Light overall", hint: "Spring / autumn", emoji: "🧣" },
      { slug: "fleece_overall", label: "Fleece overall", hint: "Warm overall", emoji: "🧸" },
      { slug: "wool_overall", label: "Wool overall", hint: "Warm overall", emoji: "🐑" },
      { slug: "softshell_overall", label: "Softshell overall", hint: "Wind & rain", emoji: "💧" },
      { slug: "rain_overall", label: "Rain overall", hint: "Rain protection", emoji: "☔" },
      { slug: "winter_overall", label: "Winter overall", hint: "Cold weather", emoji: "❄️" },
      { slug: "jacket", label: "Jacket", hint: "Outer layer", emoji: "🧥" },
      { slug: "snow_pants", label: "Rain / snow pants", hint: "Outer bottom", emoji: "🌨️" },
    ],
  },
  {
    id: "accessories",
    title: "Accessories",
    question: "Which accessories do you have?",
    items: [
      { slug: "thin_hat", label: "Thin hat", hint: "Cotton hat", emoji: "🧢" },
      { slug: "warm_hat", label: "Warm hat", hint: "Wool / fleece", emoji: "🎩" },
      { slug: "sun_hat", label: "Sun hat", hint: "Brim for shade", emoji: "👒" },
      { slug: "balaclava", label: "Balaclava", hint: "Head & neck", emoji: "🥶" },
      { slug: "mittens", label: "Mittens", hint: "For cold days", emoji: "🧤" },
      { slug: "cotton_socks", label: "Cotton socks", hint: "Everyday socks", emoji: "🧦" },
      { slug: "wool_socks", label: "Wool socks", hint: "Warm feet", emoji: "🧦" },
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
      { slug: "sleep_sack_05", label: "Sleep sack (0.5 TOG)", hint: "Very warm rooms 24–26°C", emoji: "🌙" },
      { slug: "sleep_sack_10", label: "Sleep sack (1.0 TOG)", hint: "Warm rooms 20–23°C", emoji: "🌙" },
      { slug: "sleep_sack_25", label: "Sleep sack (2.5 TOG)", hint: "Cool rooms 16–19°C", emoji: "🛌" },
      { slug: "sleep_sack_35", label: "Sleep sack (3.5 TOG)", hint: "Cold rooms below 16°C", emoji: "🛌" },
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
  s.items.map((i) => ({ slug: i.slug, label: i.label, group: s.title })),
);

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
