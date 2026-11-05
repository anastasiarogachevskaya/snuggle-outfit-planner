import { useCallback, useEffect, useState } from "react";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import {
  compactGarmentDetails,
  normalizeGarmentDetails,
  type GarmentDetails,
} from "@/lib/garment-details";

export const GUEST_STORAGE_KEY = "layerly:guest";

export type GuestAgeBand = "newborn" | "1-3m" | "3-6m" | "6-12m" | "1y+";
export type LocalOnboardingStep = "baby" | "location" | "wardrobe" | "complete";

/**
 * A comfort rating tapped before the parent has an account. `details` keeps the
 * weather and recommendation the rating referred to, so the rating can be moved
 * into the saved profile — and keep influencing advice — once they sign up.
 */
export type GuestFeedbackEntry = {
  rating: "cold" | "comfortable" | "warm";
  createdAt: string;
  details?: {
    situation: string;
    home_activity: string | null;
    transport_mode: string | null;
    duration_min: number | null;
    room_temp_c: number | null;
    temp_c: number | null;
    feels_like_c: number | null;
    weather_condition: string | null;
    uv_index: number | null;
    wind_kph: number | null;
    baby_age_months: number | null;
    temperature_pref: number | null;
    recommendation: unknown;
    recommended_clothing: unknown;
    recommended_transport_extras: unknown;
  };
};

export type GuestProfile = {
  /** Only the quick web trial picks an age band; the app asks for a real date. */
  ageBand?: GuestAgeBand;
  /** True once the on-device setup (baby, location, wardrobe) has been finished. */
  setupComplete?: boolean;
  /** Current iPhone setup screen, so interrupted setup resumes in the right place. */
  onboardingStep?: LocalOnboardingStep;
  dob: string; // ISO date — picked directly, or derived from the age band midpoint
  name: string;
  temperaturePref: number;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  wardrobe: WardrobeSlug[];
  /** Stored-format version; see upgradeGuestProfile. Missing = v1. */
  version?: number;
  /** Optional garment details (v2). Only non-default fields are stored. */
  wardrobeDetails?: Partial<Record<WardrobeSlug, Partial<GarmentDetails>>>;
  feedback: GuestFeedbackEntry[];
  createdAt: string;
};

export const GUEST_PROFILE_VERSION = 2;

export const GUEST_AGE_OPTIONS: {
  id: GuestAgeBand;
  label: string;
  months: number;
  comingSoon?: boolean;
}[] = [
  { id: "newborn", label: "Newborn (0–1 month)", months: 0.5 },
  { id: "1-3m", label: "1–3 months", months: 2 },
  { id: "3-6m", label: "3–6 months", months: 4.5 },
  { id: "6-12m", label: "6–12 months", months: 9 },
  { id: "1y+", label: "1+ years", months: 15, comingSoon: true },
];

/** A realistic starter wardrobe so guests get useful recommendations instantly. */
export const GUEST_DEFAULT_WARDROBE: WardrobeSlug[] = [
  "short_sleeve_bodysuit",
  "long_sleeve_bodysuit",
  "pants",
  "sweater",
  "cotton_socks",
  "thin_hat",
  "warm_hat",
  "fleece_overall",
  "winter_overall",
  "stroller",
  "blanket",
  "pajamas",
];

export function dobFromAgeBand(band: GuestAgeBand): string {
  const months = GUEST_AGE_OPTIONS.find((o) => o.id === band)?.months ?? 3;
  const d = new Date();
  d.setDate(d.getDate() - Math.round(months * 30.44));
  return d.toISOString().slice(0, 10);
}

export function createGuestProfile(band: GuestAgeBand): GuestProfile {
  return {
    ageBand: band,
    dob: dobFromAgeBand(band),
    name: "Baby",
    temperaturePref: 3,
    latitude: null,
    longitude: null,
    locationLabel: null,
    wardrobe: [...GUEST_DEFAULT_WARDROBE],
    feedback: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * A profile started from the app's own setup, where the parent types the
 * baby's name and picks a real date of birth instead of an age band.
 */
export function createLocalProfile(name: string, dob: string, temperaturePref = 3): GuestProfile {
  return {
    setupComplete: false,
    onboardingStep: "location",
    dob,
    name: name.trim() || "Baby",
    temperaturePref,
    latitude: null,
    longitude: null,
    locationLabel: null,
    wardrobe: [...GUEST_DEFAULT_WARDROBE],
    feedback: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Versioned, repeatable upgrade of a stored profile. Running it on an
 * already-current profile returns it unchanged (changed: false). Every
 * existing field — ownership, feedback, name, dob, location — is kept.
 */
export function upgradeGuestProfile(
  input: unknown,
): { profile: GuestProfile; changed: boolean } | null {
  if (!input || typeof input !== "object") return null;
  const parsed = input as Partial<GuestProfile> & Record<string, unknown>;
  if (!parsed.dob) return null;
  let changed = false;
  // Profiles created by older versions used the starter wardrobe without
  // storing it explicitly. Preserve that choice instead of unticking everything.
  const wardrobe = Array.isArray(parsed.wardrobe)
    ? (parsed.wardrobe.filter((slug) => typeof slug === "string") as WardrobeSlug[])
    : [...GUEST_DEFAULT_WARDROBE];
  if (!Array.isArray(parsed.wardrobe) || wardrobe.length !== parsed.wardrobe.length) changed = true;
  const feedback = Array.isArray(parsed.feedback) ? parsed.feedback : [];
  if (!Array.isArray(parsed.feedback)) changed = true;

  // v2: optional garment details keyed by slug; missing = unknown / available.
  const rawDetails =
    parsed.wardrobeDetails && typeof parsed.wardrobeDetails === "object" ? parsed.wardrobeDetails : {};
  const wardrobeDetails: Partial<Record<WardrobeSlug, Partial<GarmentDetails>>> = {};
  for (const [slug, d] of Object.entries(rawDetails)) {
    const compact = compactGarmentDetails(normalizeGarmentDetails(d));
    if (Object.keys(compact).length) wardrobeDetails[slug as WardrobeSlug] = compact;
  }
  if (JSON.stringify(wardrobeDetails) !== JSON.stringify(parsed.wardrobeDetails ?? {})) changed = true;
  if (parsed.version !== GUEST_PROFILE_VERSION) changed = true;

  return {
    profile: {
      ...(parsed as GuestProfile),
      version: GUEST_PROFILE_VERSION,
      wardrobe,
      wardrobeDetails,
      feedback,
    },
    changed,
  };
}

/** Details for one slug, filled with defaults when the parent hasn't said. */
export function guestGarmentDetails(profile: GuestProfile, slug: WardrobeSlug): GarmentDetails {
  return normalizeGarmentDetails(profile.wardrobeDetails?.[slug]);
}

export function readGuestProfile(): GuestProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const upgraded = upgradeGuestProfile(JSON.parse(raw));
    if (!upgraded) return null;
    if (upgraded.changed) writeGuestProfile(upgraded.profile);
    return upgraded.profile;
  } catch {
    return null;
  }
}

export function writeGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Safari private mode throws on write. The guest trial is deliberately
    // throwaway, so losing it is survivable — crashing the first tap of the
    // funnel into the root error boundary is not.
  }
}

export function clearGuestProfile() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

/** Hydration-safe access to the guest profile. */
export function useGuestProfile() {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(readGuestProfile());
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<GuestProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeGuestProfile(next);
      return next;
    });
  }, []);

  return { profile, loaded, setProfile, update };
}
