/**
 * Helpers for saving the signed-in wardrobe setup without overwriting what a
 * parent already has. Only items the parent actually toggled are written;
 * hidden items, unchanged rows, IDs and other columns are left alone.
 */
export type StoredWardrobeRow = { slug: string; owned: boolean };

/** No rows at all means a genuinely new wardrobe; rows with nothing owned is an intentional empty one. */
export function isNewWardrobe(rows: readonly StoredWardrobeRow[]): boolean {
  return rows.length === 0;
}

export function ownedSlugs(rows: readonly StoredWardrobeRow[]): string[] {
  return rows.filter((r) => r.owned).map((r) => r.slug);
}

/**
 * Rows to upsert: visible slugs whose owned state differs from storage.
 * A missing row counts as "not owned", so un-ticked unknown items are skipped.
 */
export function wardrobeChanges(
  rows: readonly StoredWardrobeRow[],
  selection: Iterable<string>,
  visibleSlugs: Iterable<string>,
): { slug: string; owned: boolean }[] {
  const stored = new Map(rows.map((r) => [r.slug, r.owned]));
  const chosen = new Set(selection);
  const changes: { slug: string; owned: boolean }[] = [];
  for (const slug of new Set(visibleSlugs)) {
    const want = chosen.has(slug);
    if ((stored.get(slug) ?? false) !== want) changes.push({ slug, owned: want });
  }
  return changes;
}
