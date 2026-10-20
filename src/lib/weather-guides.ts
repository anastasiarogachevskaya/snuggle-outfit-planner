/** US-search temperature guides. Advice mirrors the outfit engine's bands; keep them in sync. */
export type WeatherGuide = {
  slug: string;
  f: number;
  c: number;
  summary: string;
  stroller: string[];
  car: string;
  check: string;
};

export const WEATHER_GUIDES: WeatherGuide[] = [
  {
    slug: "60-degree-weather",
    f: 60,
    c: 16,
    summary: "Mild. Most babies need about one light layer more than you.",
    stroller: [
      "Long-sleeve bodysuit and pants",
      "A light cardigan or sweater you can take off",
      "Socks; a thin hat if it's breezy or baby is under 3 months",
    ],
    car: "Same outfit without a jacket. A warm car can overheat a baby quickly, so remove layers once it warms up.",
    check: "In the sun 60°F can feel much warmer. Check the back of the neck after 10–15 minutes.",
  },
  {
    slug: "50-degree-weather",
    f: 50,
    c: 10,
    summary: "Cool. Add a warm middle layer and a light outer layer.",
    stroller: [
      "Long-sleeve bodysuit and pants",
      "A fleece or knit sweater",
      "A light jacket or lightweight suit, thin hat and socks",
      "A stroller bunting or blanket if baby lies flat",
    ],
    car: "Thin fleece under the harness, no jacket. Buckle first, then lay a blanket over the straps.",
    check: "Wind makes 50°F feel colder. Chest and neck should feel warm, not sweaty.",
  },
  {
    slug: "40-degree-weather",
    f: 40,
    c: 4,
    summary: "Cold. Time for a snowsuit or a warm stroller bunting.",
    stroller: [
      "Long-sleeve bodysuit and pants",
      "A snowsuit — with a warm bunting you often don't need a fleece underneath",
      "Warm hat, mittens and warm socks",
    ],
    car: "No snowsuit under the harness. Use a fleece and warm bottoms, then a blanket over the buckled straps.",
    check: "Snowsuits and buntings differ a lot in warmth. After the first walk, adjust the middle layer.",
  },
  {
    slug: "30-degree-weather",
    f: 30,
    c: -1,
    summary: "Freezing. Full winter gear, short exposed time.",
    stroller: [
      "Long-sleeve bodysuit and pants (warmer bottoms from about 23°F)",
      "Snowsuit plus a stroller bunting",
      "Warm hat covering the ears, mittens and warm socks",
      "Add a fleece or wool layer under the snowsuit when it's about 23°F or colder",
    ],
    car: "Thin layers only under the harness, never a snowsuit. Blanket over the straps once buckled.",
    check: "Check cheeks and nose often. Babies under 2 months should only go out briefly in freezing weather.",
  },
];

export const getWeatherGuide = (slug: string) => WEATHER_GUIDES.find((g) => g.slug === slug);
