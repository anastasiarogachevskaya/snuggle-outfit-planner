/**
 * Weather changes during a gated toddler outing (T20).
 *
 * The departure Recommendation remains the outfit to wear now. Each intact
 * T19 interval is evaluated independently with its own paired instantaneous
 * readings and preceding-hour rain. Later outfits are compared with the
 * departure outfit; they are never merged into it, so packed clothes add no
 * warmth and transport equipment remains separate.
 */
import type { OutingWeather } from "../outing-weather";
import { isRainingCode } from "../weather";
import { wornProfile } from "../clothing-needs";
import type { SetAsideReason } from "../wardrobe-eligibility";
import type { RainArea } from "./rain-protection";
import type { RecommendInput, Recommendation } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";

export type OutingPeriod = {
  /** Full preceding-hour interval, not an invented exact rain start. */
  start: string;
  end: string;
  /** The part that actually overlaps the requested outing. */
  overlapStart: string;
  overlapEnd: string;
};

export type EvaluatedOutingWeather = OutingPeriod & {
  /** The paired provider instant used for this interval's clothing rules. */
  evaluatedAt: string;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  code: number;
  /** Existing rain code, or preceding-hour rain/showers greater than zero. */
  raining: boolean;
  rainMm: number;
  showersMm: number;
};

export type PackingCategory = "clothing" | "accessory" | "footwear" | "transport";
export type PackingAvailability = "available" | "not_owned" | SetAsideReason;
export type ProtectionStatus = "confirmed" | "unconfirmed" | "unmet";

export type ChangeGarment = {
  slug: WardrobeSlug;
  label: string;
  usingLabel?: string;
  category: PackingCategory;
};

export type LaterChangeReason = "colder" | "warmer" | "rain" | "weather_change";
export type LaterChange = {
  kind: "add" | "remove" | "replace";
  /** Clothing slot, accessory role, or transport-equipment role. */
  role: string;
  from?: ChangeGarment;
  to?: ChangeGarment;
  reasons: LaterChangeReason[];
  periods: OutingPeriod[];
};

export type PackingItem = ChangeGarment & {
  /** "available" only for the eligible owned wardrobe. */
  availability: PackingAvailability;
  /** Parent-stated protection only; null when no protection requirement applies. */
  protection: ProtectionStatus | null;
  /** T15A: no shell was stacked over this warm outer garment. */
  notLayeredOver?: boolean;
  reasons: LaterChangeReason[];
  periods: OutingPeriod[];
};

export type LaterProtectionNeed = {
  kind: "rain" | "footwear";
  slug: WardrobeSlug;
  status: Exclude<ProtectionStatus, "confirmed">;
  areas?: RainArea[];
  notLayeredOver: boolean;
  periods: OutingPeriod[];
};

export type OutingPreparation = {
  departureAt: string | null;
  returnAt: string | null;
  coverage: OutingWeather["coverage"];
  /** Only intact covered intervals; missing readings are never substituted. */
  evaluated: EvaluatedOutingWeather[];
  changes: LaterChange[];
  /** Distinct later additions/replacements; never part of the departure outfit. */
  packing: PackingItem[];
  /** Owned options whose required protection remains unresolved later. */
  protection: LaterProtectionNeed[];
  /** Generic only: inventory has no quantities, so worn items are not spares. */
  spareSuggestion: string | null;
  notes: string[];
};

type Evaluate = (input: RecommendInput) => Recommendation;
type Period = OutingPeriod;

const REQUIRED_FIELDS = ["tempC", "feelsLikeC", "windKph", "code", "rainMm", "showersMm"] as const;
const periodKey = (p: Period) => `${p.start}/${p.end}/${p.overlapStart}/${p.overlapEnd}`;
const mergePeriods = (existing: Period[], incoming: Period[]) => {
  const out = [...existing];
  const seen = new Set(out.map(periodKey));
  for (const p of incoming) {
    if (seen.has(periodKey(p))) continue;
    seen.add(periodKey(p));
    out.push(p);
  }
  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
};
const mergeReasons = (a: LaterChangeReason[], b: LaterChangeReason[]) => [...new Set([...a, ...b])];
function periodOf(interval: OutingWeather["intervals"][number]): Period {
  return {
    start: interval.start,
    end: interval.end,
    overlapStart: interval.overlapStart,
    overlapEnd: interval.overlapEnd,
  };
}

function transportRole(slug: WardrobeSlug): string {
  if (slug === "footmuff" || slug === "blanket" || slug === "car_seat_blanket")
    return "ride_warmth";
  return slug;
}

function outfitRoles(rec: Recommendation): Map<string, ChangeGarment[]> {
  const roles = new Map<string, ChangeGarment[]>();
  const add = (role: string, item: ChangeGarment) => {
    const list = roles.get(role) ?? [];
    if (!list.some((i) => i.slug === item.slug)) list.push(item);
    roles.set(role, list);
  };
  for (const l of rec.babyClothing) {
    if (l.slug === "diaper_only") continue;
    add(l.slot, {
      slug: l.slug,
      label: l.label,
      ...(l.usingLabel ? { usingLabel: l.usingLabel } : {}),
      category: "clothing",
    });
  }
  const footwearSlug = rec.footwear ? (rec.footwear.selected ?? rec.footwear.missingSlug) : null;
  for (const a of rec.accessories) {
    const role = a.slug === footwearSlug ? "footwear" : (wornProfile(a.slug)?.role ?? a.slug);
    add(role, {
      slug: a.slug,
      label: a.label,
      ...(a.usingLabel ? { usingLabel: a.usingLabel } : {}),
      category: a.slug === footwearSlug ? "footwear" : "accessory",
    });
  }
  for (const a of rec.transportExtras)
    add(transportRole(a.slug), {
      slug: a.slug,
      label: a.label,
      ...(a.usingLabel ? { usingLabel: a.usingLabel } : {}),
      category: "transport",
    });
  for (const a of rec.missingHelpfulItems) {
    // Missing transport extras are still later equipment needs, never clothing.
    if (
      !["rain_cover", "footmuff", "blanket", "babywearing_cover", "car_seat_blanket"].includes(
        a.slug,
      )
    )
      continue;
    add(transportRole(a.slug), {
      slug: a.slug,
      label: a.label,
      category: "transport",
    });
  }
  return roles;
}

function reasonFor(
  before: Recommendation,
  after: Recommendation,
  slug: WardrobeSlug,
  period: EvaluatedOutingWeather,
  departureFeelsLikeC: number,
): LaterChangeReason {
  if (before.rainProtection?.added.includes(slug) || after.rainProtection?.added.includes(slug))
    return "rain";
  if (
    period.raining &&
    (after.rainProtection?.required.length || before.rainProtection?.required.length)
  )
    return "rain";
  if (period.feelsLikeC < departureFeelsLikeC) return "colder";
  if (period.feelsLikeC > departureFeelsLikeC) return "warmer";
  return "weather_change";
}

function compareOutfits(
  before: Recommendation,
  after: Recommendation,
  period: EvaluatedOutingWeather,
  departureFeelsLikeC: number,
): LaterChange[] {
  const a = outfitRoles(before);
  const b = outfitRoles(after);
  const changes: LaterChange[] = [];
  const add = (
    kind: LaterChange["kind"],
    role: string,
    from?: ChangeGarment,
    to?: ChangeGarment,
  ) => {
    const slug = (to ?? from)?.slug;
    if (!slug) return;
    changes.push({
      kind,
      role,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      reasons: [reasonFor(before, after, slug, period, departureFeelsLikeC)],
      periods: [period],
    });
  };

  for (const role of new Set([...a.keys(), ...b.keys()])) {
    const beforeItems = a.get(role) ?? [];
    const afterItems = b.get(role) ?? [];
    const beforeSlugs = new Set(beforeItems.map((i) => i.slug));
    const afterSlugs = new Set(afterItems.map((i) => i.slug));
    const removed = beforeItems.filter((i) => !afterSlugs.has(i.slug));
    const added = afterItems.filter((i) => !beforeSlugs.has(i.slug));
    if (!removed.length && !added.length) continue;
    if (removed.length === 1 && added.length === 1) add("replace", role, removed[0], added[0]);
    else {
      for (const item of removed) add("remove", role, item);
      for (const item of added) add("add", role, undefined, item);
    }
  }
  return changes;
}

function mergeChange(list: LaterChange[], incoming: LaterChange) {
  const key = (c: LaterChange) => `${c.kind}/${c.role}/${c.from?.slug ?? ""}/${c.to?.slug ?? ""}`;
  const found = list.find((c) => key(c) === key(incoming));
  if (!found) {
    list.push(incoming);
    return;
  }
  found.periods = mergePeriods(found.periods, incoming.periods);
  found.reasons = mergeReasons(found.reasons, incoming.reasons);
}

function protectionFor(slug: WardrobeSlug, rec: Recommendation): ProtectionStatus | null {
  const rainAreas = rec.rainProtection?.areas.filter((a) => a.slug === slug) ?? [];
  if (rainAreas.some((a) => a.status === "unmet")) return "unmet";
  if (rainAreas.some((a) => a.status === "unconfirmed")) return "unconfirmed";
  if (rainAreas.length && rainAreas.every((a) => a.status === "confirmed")) return "confirmed";
  if (rec.footwear && (rec.footwear.selected === slug || rec.footwear.missingSlug === slug)) {
    if (rec.footwear.waterproof === "unmet") return "unmet";
    if (rec.footwear.waterproof === "unconfirmed") return "unconfirmed";
    if (rec.footwear.waterproof === "confirmed") return "confirmed";
  }
  return null;
}

const protectionRank: Record<ProtectionStatus, number> = { confirmed: 0, unconfirmed: 1, unmet: 2 };

function mergePacking(list: PackingItem[], incoming: PackingItem) {
  const found = list.find((p) => p.slug === incoming.slug && p.category === incoming.category);
  if (!found) {
    list.push(incoming);
    return;
  }
  found.periods = mergePeriods(found.periods, incoming.periods);
  found.reasons = mergeReasons(found.reasons, incoming.reasons);
  if (
    incoming.protection &&
    (!found.protection || protectionRank[incoming.protection] > protectionRank[found.protection])
  )
    found.protection = incoming.protection;
  found.notLayeredOver = Boolean(found.notLayeredOver || incoming.notLayeredOver);
}

function mergeProtection(list: LaterProtectionNeed[], incoming: LaterProtectionNeed) {
  const found = list.find(
    (p) =>
      p.kind === incoming.kind &&
      p.slug === incoming.slug &&
      p.status === incoming.status &&
      p.notLayeredOver === incoming.notLayeredOver &&
      JSON.stringify(p.areas) === JSON.stringify(incoming.areas),
  );
  if (!found) list.push(incoming);
  else found.periods = mergePeriods(found.periods, incoming.periods);
}

/** Build later changes and packing without changing the departure Recommendation. */
export function buildOutingPreparation(
  input: RecommendInput,
  weather: OutingWeather,
  departure: Recommendation,
  evaluate: Evaluate,
): OutingPreparation {
  const evaluated: EvaluatedOutingWeather[] = [];
  const changes: LaterChange[] = [];
  const packing: PackingItem[] = [];
  const protection: LaterProtectionNeed[] = [];
  const departureSlugs = new Set([...outfitRoles(departure).values()].flat().map((i) => i.slug));

  for (const interval of weather.intervals) {
    if (!interval.startSample || REQUIRED_FIELDS.some((f) => interval.missingFields.includes(f)))
      continue;
    const sample = interval.endSample;
    if (
      sample.tempC === null ||
      sample.feelsLikeC === null ||
      sample.windKph === null ||
      sample.code === null ||
      sample.rainMm === null ||
      sample.showersMm === null
    )
      continue;
    const period: EvaluatedOutingWeather = {
      ...periodOf(interval),
      evaluatedAt: sample.time,
      tempC: sample.tempC,
      feelsLikeC: sample.feelsLikeC,
      windKph: sample.windKph,
      code: sample.code,
      raining: isRainingCode(sample.code) || sample.rainMm > 0 || sample.showersMm > 0,
      rainMm: sample.rainMm,
      showersMm: sample.showersMm,
    };
    evaluated.push(period);
    // UV/cloud are paired hourly values when supplied. No departure UV value is
    // copied into a later instant, and no end-only temperature shortcut is used.
    const later = evaluate({
      ...input,
      feelsLikeC: sample.feelsLikeC,
      isRaining: period.raining,
      feelsLikeAtEndC: undefined,
      uvIndex: sample.uvIndex ?? undefined,
      cloudCoverPct: sample.cloudCoverPct ?? undefined,
    });

    for (const change of compareOutfits(departure, later, period, input.feelsLikeC)) {
      mergeChange(changes, change);
      const item = change.to;
      if (!item || departureSlugs.has(item.slug)) continue;
      const availability: PackingAvailability = input.owned.has(item.slug)
        ? "available"
        : (input.setAside?.get(item.slug) ?? "not_owned");
      mergePacking(packing, {
        ...item,
        availability,
        protection: protectionFor(item.slug, later),
        ...(later.rainProtection?.notLayeredOver.some((n) => n.slug === item.slug)
          ? { notLayeredOver: true }
          : {}),
        reasons: [...change.reasons],
        periods: [period],
      });
    }

    const notLayered = new Set(later.rainProtection?.notLayeredOver.map((n) => n.slug) ?? []);
    for (const gap of later.rainProtection?.gaps ?? []) {
      if (gap.kind !== "waterproofing") continue;
      mergeProtection(protection, {
        kind: "rain",
        slug: gap.slug,
        status: gap.status,
        areas: gap.areas,
        notLayeredOver: notLayered.has(gap.slug),
        periods: [period],
      });
    }
    for (const gap of later.footwear?.gaps ?? []) {
      if (gap.kind !== "waterproofing") continue;
      mergeProtection(protection, {
        kind: "footwear",
        slug: gap.slug,
        status: gap.status,
        notLayeredOver: false,
        periods: [period],
      });
    }
  }

  const notes: string[] = [];
  if (weather.coverage !== "complete")
    notes.push(
      "Only covered forecast periods were checked. Uncovered weather may still need other clothing or protection.",
    );
  if (evaluated.some((p) => p.raining))
    notes.push(
      "Rain amounts describe possible overlapping one-hour periods, not exact rain start times; amounts are not prorated.",
    );
  if (weather.coverage === "complete" && !changes.length && !protection.length)
    notes.push("No later clothing changes were found in the covered forecast.");

  const wetGround = input.outing?.situation === "walk" && input.outing.ground === "wet";
  const spareSuggestion =
    input.isRaining || wetGround || evaluated.some((p) => p.raining)
      ? "For rain or wet ground, consider spare socks and bottoms if you have them. Layerly doesn't track quantities, so the clothes being worn aren't counted as spares."
      : null;

  return {
    departureAt: weather.departure,
    returnAt: weather.return,
    coverage: weather.coverage,
    evaluated,
    changes,
    packing,
    protection,
    spareSuggestion,
    notes,
  };
}
