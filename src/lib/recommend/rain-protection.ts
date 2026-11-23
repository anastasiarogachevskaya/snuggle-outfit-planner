/**
 * Wearable rain protection for toddler walking outings (T15).
 *
 * Applies only where the walking-footwear rule does (`walkingFootwearApplies`:
 * 12–35 months, toddler switch on, an outdoor walk whose movement the parent
 * *stated* as walking, active play or mixed). Seated/carried, unstated
 * movement, infants, home, car and sleep never reach it.
 *
 * What asks for protection (never anything else):
 *   - The existing rain signal (`isRaining === true`): upper and lower body.
 *     No precipitation threshold is invented here.
 *   - A parent-stated wet ground: lower body, even without current rain.
 *   - An activity name (e.g. "wet play") never stands in for rain or ground.
 *   - Snowy ground is left to a separate snow/insulation policy.
 *
 * How it is met:
 *   - One full-body shell (rain overall, …) or separate upper and lower
 *     shells (waterproof jacket + rain pants, …), worn over everyday
 *     clothing and mid layers (sweater, fleece…).
 *   - Warmth outerwear the existing rules put in the outfit (winter overall,
 *     jacket, rain / snow pants, or any outer garment the parent stated as
 *     insulated) is never layered over (T15A): how a shell fits and feels
 *     over it hasn't been assessed. It stays as the outfit's warm layer and
 *     covers its own areas; stated waterproof confirms them, otherwise they
 *     stay unconfirmed/unmet (or missing, when the outfit lacks it). No shell
 *     overlapping those areas is added; open areas may still get a shell.
 *   - Shells are only *added* over the outfit; no insulating layer, everyday
 *     bottoms or other outerwear is ever removed or swapped.
 *   - Each garment is used once. Only owned, available garments are used.
 *   - Garment type only decides which areas a garment covers. Whether it is
 *     waterproof comes only from the parent's stated detail: "yes" confirms,
 *     "Not sure"/unstated is unconfirmed, "no" is unmet. Names and catalogue
 *     hints (including the legacy "Rain / snow pants") never supply it.
 *   - Combinations are ranked by protection first (confirmed beats
 *     unconfirmed beats unmet beats missing), then by fewer added garments,
 *     then by a fixed type order. An owned garment with weak or unstated
 *     protection stays owned; its gap is reported beside it.
 *   - Transport covers (stroller rain cover, babywearing cover) are never
 *     worn protection and are left exactly as the transport rules chose them.
 *
 * Not judged here: shell warmth — an added shell's thermal effect is
 * "unknown" (never a confirmed zero), so no warmth values are assumed and the
 * rest of the outfit isn't adjusted for it — grip or overall suitability.
 * Footwear stays with footwear.ts.
 */
import type { GarmentDetails } from "../garment-details";
import { wornProfile } from "../clothing-needs";
import type { Layer } from "../recommend";
import type { OutingContext } from "../outing-context";
import { LABEL_BY_SLUG, type WardrobeSlug } from "../wardrobe-catalog";
import type { SetAsideReason } from "../wardrobe-eligibility";
import type { FootwearGround, UnusableReason, WalkingMovement } from "./footwear";

export const RAIN_AREAS = ["upper_body", "lower_body"] as const;
export type RainArea = (typeof RAIN_AREAS)[number];

/**
 * Garments that may be *added* as a rain shell, by coverage, most
 * purpose-made first. Type and coverage only — never a protection claim.
 * Winter overalls and warm jackets are picked for warmth by the existing
 * rules and are never added just for rain; when already worn they count.
 */
export const RAIN_SHELL_ORDER: readonly WardrobeSlug[] = [
  "rain_overall",
  "waterproof_jacket",
  "rain_pants",
  "softshell_overall",
  "light_overall",
  "snow_pants",
];
/**
 * Outer garments the existing warmth rules place in the outfit for warmth
 * (map-wardrobe.ts: winter overall, the jacket that stands in for a sweater,
 * jacket + rain / snow pants). This is the garment's role in the outfit, not
 * a claim about its insulation detail, which stays parent-stated.
 */
export const WARMTH_OUTERWEAR: readonly WardrobeSlug[] = ["winter_overall", "jacket", "snow_pants"];

/** What the outfit needs when nothing owned covers the area. */
const MISSING_FOR: Record<"both" | RainArea, WardrobeSlug> = {
  both: "rain_overall",
  upper_body: "waterproof_jacket",
  lower_body: "rain_pants",
};

export type RainAreaStatus = "confirmed" | "unconfirmed" | "unmet" | "missing";
const SCORE: Record<RainAreaStatus, number> = {
  confirmed: 0,
  unconfirmed: 1,
  unmet: 2,
  missing: 3,
};

export const RAIN_NOT_JUDGED = ["shell_warmth", "grip", "overall_suitability"] as const;

export type RainGap =
  /** Nothing owned and available covers these areas: this garment is missing. */
  | { kind: "missing_garment"; slug: WardrobeSlug; areas: RainArea[] }
  /** An owned garment covers these areas, but its waterproofing isn't confirmed or is stated no. */
  | {
      kind: "waterproofing";
      status: "unconfirmed" | "unmet";
      slug: WardrobeSlug;
      areas: RainArea[];
    };

export type RainGarment = {
  slug: WardrobeSlug;
  /** Required areas this garment covers in the chosen combination. */
  covers: RainArea[];
  /** "outfit" = already chosen by the existing rules; "added" = added for rain. */
  source: "outfit" | "added";
  owned: boolean;
  /** Parent-stated only ("unknown" when unstated); null for a missing garment. */
  protection: Pick<GarmentDetails, "waterproof" | "insulation"> | null;
  /**
   * "counted": already part of the outfit's warmth. "unknown": an added
   * shell whose thermal effect hasn't been assessed — never a confirmed zero.
   */
  warmth: "counted" | "unknown";
};

/** Warmth outerwear in the outfit that no shell was layered over (T15A). */
export type NotLayeredOver = {
  slug: WardrobeSlug;
  /** Areas it covers, which therefore get no overlapping shell. */
  areas: RainArea[];
  /** False when the outfit needs it but the parent doesn't have it. */
  owned: boolean;
  /** Owned, available shells that would overlap it and weren't added. */
  skipped: WardrobeSlug[];
};

export type RainProtectionNeed = {
  need: "wearable_rain";
  movement: WalkingMovement;
  /** The existing rain signal as given; null when no weather was supplied. */
  raining: boolean | null;
  ground: FootwearGround;
  /** Areas that need waterproof cover; empty when nothing asks for it. */
  required: RainArea[];
  reasons: ("rain" | "wet_ground")[];
  /** Garments covering the required areas (outfit and added), each once. */
  garments: RainGarment[];
  /** Per required area: how well it's covered and by what. */
  areas: { area: RainArea; status: RainAreaStatus; slug: WardrobeSlug | null }[];
  /** Slugs this rule placed in `babyClothing` (owned or missing), outer slot. */
  added: WardrobeSlug[];
  /** Warmth outerwear left without a shell over it, because compatibility is unassessed. */
  notLayeredOver: NotLayeredOver[];
  /** True only when every required area is confirmed; null when none required. */
  waterproofingMet: boolean | null;
  gaps: RainGap[];
  /** Shell types for required areas that couldn't be used, with why. */
  unusable: { slug: WardrobeSlug; reason: UnusableReason }[];
  notJudged: typeof RAIN_NOT_JUDGED;
  notes: string[];
};

type Piece = {
  slug: WardrobeSlug;
  coverage: RainArea[];
  source: "outfit" | "added";
  owned: boolean;
  status: RainAreaStatus;
  order: number;
};

const rainCoverage = (slug: WardrobeSlug): RainArea[] => {
  const p = wornProfile(slug);
  if (!p || p.role !== "outerwear") return [];
  return RAIN_AREAS.filter((a) => p.coverage.includes(a));
};

const statusOf = (w: GarmentDetails["waterproof"] | undefined): RainAreaStatus =>
  w === "yes" ? "confirmed" : w === "no" ? "unmet" : "unconfirmed";

const plural = (slug: WardrobeSlug) => slug.endsWith("pants");
const name = (slug: WardrobeSlug) => LABEL_BY_SLUG[slug].toLowerCase();
const areaText = (areas: readonly RainArea[]) =>
  areas.length === 2 ? "upper body and legs" : areas[0] === "upper_body" ? "upper body" : "legs";

export function selectRainProtection(input: {
  movement: WalkingMovement;
  isRaining?: boolean;
  outing?: OutingContext;
  /** The outfit the existing rules chose (mapped babyClothing). */
  outfit: readonly Layer[];
  /** Slugs the outfit lists as missing. */
  outfitMissing?: readonly string[];
  /** Eligible wardrobe (owned and available). */
  owned: ReadonlySet<WardrobeSlug>;
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>;
  details?: ReadonlyMap<WardrobeSlug, Partial<GarmentDetails>> | null;
  /** Transport extras chosen for the trip (for the rain-cover note only). */
  transportExtras?: readonly WardrobeSlug[];
}): RainProtectionNeed {
  const ground: FootwearGround = input.outing?.ground ?? "unknown";
  const raining = input.isRaining ?? null;
  const reasons: RainProtectionNeed["reasons"] = [];
  if (raining === true) reasons.push("rain");
  if (ground === "wet") reasons.push("wet_ground");
  const required: RainArea[] =
    raining === true ? ["upper_body", "lower_body"] : ground === "wet" ? ["lower_body"] : [];

  const base = {
    need: "wearable_rain" as const,
    movement: input.movement,
    raining,
    ground,
    required,
    reasons,
    notJudged: RAIN_NOT_JUDGED,
  };

  if (required.length === 0) {
    const notes: string[] = [];
    if (input.outing?.activity === "wet_play")
      notes.push(
        "Wet play was chosen, but no rain or wet ground was given, so rain gear wasn't added.",
      );
    return {
      ...base,
      garments: [],
      areas: [],
      added: [],
      notLayeredOver: [],
      waterproofingMet: null,
      gaps: [],
      unusable: [],
      notes,
    };
  }

  const stated = (slug: WardrobeSlug) => ({
    waterproof: input.details?.get(slug)?.waterproof ?? "unknown",
    insulation: input.details?.get(slug)?.insulation ?? "unknown",
  });
  const touches = (cov: readonly RainArea[]) => cov.some((a) => required.includes(a));
  const missingInOutfit = new Set(input.outfitMissing ?? []);
  const inOutfit = new Set(input.outfit.map((l) => l.slug));

  // Candidates: outerwear already worn, owned shells to add, and a missing
  // placeholder per coverage shape.
  const isWarmthOuter = (slug: WardrobeSlug) =>
    WARMTH_OUTERWEAR.includes(slug) ||
    (["light", "insulated"] as string[]).includes(stated(slug).insulation);
  const pieces: Piece[] = [];
  const warmthOuter: { slug: WardrobeSlug; coverage: RainArea[]; owned: boolean }[] = [];
  for (const l of input.outfit) {
    if (l.slot !== "outer" || l.slug === "diaper_only") continue;
    const coverage = rainCoverage(l.slug);
    const owned = !missingInOutfit.has(l.slug) && input.owned.has(l.slug);
    const warm = isWarmthOuter(l.slug);
    // Warmth outerwear holds every area it covers, even ones this outing
    // doesn't need covered: a rain overall over a jacket still stacks.
    if (warm && coverage.length) warmthOuter.push({ slug: l.slug, coverage, owned });
    if (!touches(coverage)) continue;
    // A missing ordinary outer garment never counts; a missing warmth layer
    // still holds its areas, because the outfit still needs it there.
    if (!owned && !warm) continue;
    const piece: Piece = {
      slug: l.slug,
      coverage,
      source: "outfit",
      owned,
      status: owned ? statusOf(stated(l.slug).waterproof) : "missing",
      order: -1,
    };
    pieces.push(piece);
  }
  // Areas held by warmth outerwear get no overlapping shell (T15A).
  const held = new Set<RainArea>(warmthOuter.flatMap((p) => p.coverage));
  const overlapsHeld = (cov: readonly RainArea[]) => cov.some((a) => held.has(a));
  const skipped: WardrobeSlug[] = [];
  const unusable: RainProtectionNeed["unusable"] = [];
  RAIN_SHELL_ORDER.forEach((slug, order) => {
    if (inOutfit.has(slug)) return;
    const coverage = rainCoverage(slug);
    if (!touches(coverage)) return;
    if (overlapsHeld(coverage)) {
      if (input.owned.has(slug)) skipped.push(slug);
      return;
    }
    if (input.owned.has(slug))
      pieces.push({
        slug,
        coverage,
        source: "added",
        owned: true,
        status: statusOf(stated(slug).waterproof),
        order,
      });
    else unusable.push({ slug, reason: input.setAside?.get(slug) ?? "not_owned" });
  });
  const placeholders: WardrobeSlug[] =
    required.length === 2
      ? [MISSING_FOR.both, MISSING_FOR.upper_body, MISSING_FOR.lower_body]
      : [MISSING_FOR.lower_body];
  for (const slug of placeholders) {
    if (input.owned.has(slug) || inOutfit.has(slug)) continue;
    if (overlapsHeld(rainCoverage(slug))) continue;
    pieces.push({
      slug,
      coverage: rainCoverage(slug),
      source: "added",
      owned: false,
      status: "missing",
      order: RAIN_SHELL_ORDER.length + RAIN_SHELL_ORDER.indexOf(slug),
    });
  }

  // Every combination of one or two garments that covers the required areas
  // without a redundant garment.
  const covers = (plan: Piece[]) => required.every((a) => plan.some((p) => p.coverage.includes(a)));
  const plans: Piece[][] = [];
  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i]!;
    if (covers([a])) {
      plans.push([a]);
      continue;
    }
    for (let j = i + 1; j < pieces.length; j++) {
      const b = pieces[j]!;
      if (covers([b]) || !covers([a, b])) continue;
      plans.push([a, b]);
    }
  }

  const areaStatus = (plan: Piece[], area: RainArea) => {
    const best = plan
      .filter((p) => p.coverage.includes(area))
      .sort((x, y) => SCORE[x.status] - SCORE[y.status] || x.order - y.order)[0]!;
    return { area, status: best.status, slug: best.owned ? best.slug : null, piece: best };
  };
  const rank = (plan: Piece[]) => {
    const s = required.map((a) => SCORE[areaStatus(plan, a).status]);
    return [
      Math.max(...s),
      s.reduce((x, y) => x + y, 0),
      plan.filter((p) => p.source === "added").length,
      plan.reduce((x, p) => x + p.order, 0),
    ];
  };
  const cmp = (x: number[], y: number[]) => {
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k]! - y[k]!;
    return 0;
  };
  plans.sort(
    (x, y) =>
      cmp(rank(x), rank(y)) ||
      x
        .map((p) => p.slug)
        .join()
        .localeCompare(y.map((p) => p.slug).join()),
  );
  // Stable reading order: outfit garments first, then shells by type order.
  const typeIndex = (p: Piece) => (p.source === "outfit" ? -1 : RAIN_SHELL_ORDER.indexOf(p.slug));
  const plan = [...plans[0]!].sort((x, y) => typeIndex(x) - typeIndex(y));

  const areas = required.map((a) => areaStatus(plan, a));
  const garments: RainGarment[] = plan.map((p) => ({
    slug: p.slug,
    covers: required.filter((a) => p.coverage.includes(a)),
    source: p.source,
    owned: p.owned,
    protection: p.owned ? stated(p.slug) : null,
    warmth: p.source === "outfit" ? "counted" : "unknown",
  }));
  const notLayeredOver: NotLayeredOver[] = warmthOuter
    .map((p) => ({
      slug: p.slug,
      areas: p.coverage,
      owned: p.owned,
      skipped: skipped.filter((sk) => rainCoverage(sk).some((a) => p.coverage.includes(a))),
    }))
    .filter((n) => touches(n.areas) || n.skipped.length > 0);
  const added = plan.filter((p) => p.source === "added").map((p) => p.slug);

  const why = reasons.includes("rain") ? "the rain" : "wet ground";
  const gaps: RainGap[] = [];
  const notes: string[] = [];
  for (const g of garments) {
    const p = plan.find((x) => x.slug === g.slug)!;
    if (p.status === "confirmed") continue;
    if (p.status === "missing" && p.source === "outfit") {
      // The outfit's own warm layer is missing: it's already listed as
      // missing clothing, and no shell is put in its place.
      gaps.push({ kind: "missing_garment", slug: g.slug, areas: g.covers });
      notes.push(
        `This outing needs waterproof cover for the ${areaText(g.covers)}, but the ${name(g.slug)} the outfit needs there is missing, so its waterproofing can't be checked.`,
      );
      continue;
    }
    if (p.status === "missing") {
      gaps.push({ kind: "missing_garment", slug: g.slug, areas: g.covers });
      notes.push(
        `This outing needs waterproof cover for the ${areaText(g.covers)}, but none of your rain gear for it can be used right now.`,
      );
      for (const u of unusable) {
        if (!rainCoverage(u.slug).some((a) => g.covers.includes(a))) continue;
        const verb = plural(u.slug) ? "are" : "is";
        if (u.reason === "outgrown") notes.push(`Your ${name(u.slug)} ${verb} marked outgrown.`);
        else if (u.reason === "temporarily_unavailable")
          notes.push(`Your ${name(u.slug)} ${verb} marked temporarily unavailable.`);
      }
      continue;
    }
    const verb = plural(g.slug) ? "are" : "is";
    if (p.status === "unmet") {
      gaps.push({ kind: "waterproofing", status: "unmet", slug: g.slug, areas: g.covers });
      notes.push(
        `Your ${name(g.slug)} ${verb} marked not waterproof, so ${why} still needs waterproof cover for the ${areaText(g.covers)} — clothes may get wet.`,
      );
    } else {
      gaps.push({ kind: "waterproofing", status: "unconfirmed", slug: g.slug, areas: g.covers });
      notes.push(
        `Your ${name(g.slug)} ${verb} not confirmed as waterproof — check before going out in ${why}, or add it in Wardrobe details.`,
      );
    }
  }
  for (const n of notLayeredOver) {
    const st = plan.find((p) => p.slug === n.slug)?.status;
    if (!touches(n.areas) || st === "confirmed") continue;
    const verb = plural(n.slug) ? "stay" : "stays";
    notes.push(
      `Layerly doesn't put rain gear over ${plural(n.slug) ? "" : "a "}${name(n.slug)} yet — how they fit and feel together hasn't been checked — so ${plural(n.slug) ? "they" : "it"} ${verb} as the warm layer for the ${areaText(n.areas.filter((a) => required.includes(a)))}.`,
    );
  }
  if (plan.some((p) => p.source === "added" && p.owned))
    notes.push(
      "Rain layers go over the outfit. Layerly doesn't know how much warmth they add, so it hasn't adjusted the other layers — check your child isn't getting too warm or cold underneath.",
    );
  if (input.transportExtras?.includes("rain_cover"))
    notes.push(
      "The stroller rain cover only keeps your child dry while riding — they need their own rain gear while walking.",
    );

  return {
    ...base,
    garments,
    areas: areas.map(({ area, status, slug }) => ({ area, status, slug })),
    added,
    notLayeredOver,
    waterproofingMet: areas.every((a) => a.status === "confirmed"),
    gaps,
    unusable,
    notes,
  };
}
