import { useCallback, useEffect, useState } from "react";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";

export const GUEST_STORAGE_KEY = "layerly:guest";

export type GuestAgeBand = "newborn" | "1-3m" | "3-6m" | "6-12m" | "1y+";

export type GuestProfile = {
  ageBand: GuestAgeBand;
  dob: string; // ISO date, derived from the age band midpoint
  name: string;
  temperaturePref: number;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  createdAt: string;
};

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
    createdAt: new Date().toISOString(),
  };
}

export function readGuestProfile(): GuestProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestProfile;
    if (!parsed?.dob) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
}

export function clearGuestProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_STORAGE_KEY);
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
