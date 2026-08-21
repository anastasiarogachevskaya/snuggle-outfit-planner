/**
 * Reverse geocoding for weather lookups.
 *
 * Never throws and never hangs: the request is aborted after
 * REVERSE_GEOCODE_TIMEOUT_MS so a slow or unreachable geocoder can't keep the
 * "Locating…" state on screen. On any failure the result is `null` and the
 * caller falls back to raw coordinates (or no label at all).
 */

export const REVERSE_GEOCODE_TIMEOUT_MS = 6000;

export type ReverseGeocodePlace = { name: string; country: string | null };

function abortSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

/** Resolves to the nearest place, or `null` when it times out / fails. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs: number = REVERSE_GEOCODE_TIMEOUT_MS,
): Promise<ReverseGeocodePlace | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en`,
      { signal: abortSignal(timeoutMs) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const place = json?.results?.[0];
    if (!place?.name) return null;
    return { name: place.name, country: place.country ?? null };
  } catch {
    return null;
  }
}

/** "Helsinki, Finland" — or `null` when the lookup failed. */
export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
  timeoutMs?: number,
): Promise<string | null> {
  const place = await reverseGeocode(latitude, longitude, timeoutMs);
  if (!place) return null;
  return place.country ? `${place.name}, ${place.country}` : place.name;
}

/** Coordinate fallback used when no place name is available. */
export function coordinateLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}
