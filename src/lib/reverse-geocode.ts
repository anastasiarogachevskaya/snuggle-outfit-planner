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

/**
 * Uses BigDataCloud's free client-side reverse geocoder, not Open-Meteo's
 * own `/v1/reverse` endpoint: that endpoint 404s for the large majority of
 * real coordinates (confirmed against several city centers, including ones
 * it lists in its own `/v1/search` results), which meant most users saw raw
 * coordinates instead of a place name. No API key is required for this
 * BigDataCloud endpoint.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  timeoutMs: number = REVERSE_GEOCODE_TIMEOUT_MS,
): Promise<ReverseGeocodePlace | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: abortSignal(timeoutMs) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const name = json?.city || json?.locality || json?.principalSubdivision;
    if (!name) return null;
    return { name, country: json?.countryName ?? null };
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
