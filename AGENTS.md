<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep the public landing page isolated to landing-specific typography tokens and composition so product screens retain their established design system.
- Localize clothing text only at UI boundaries through the shared display helper; preserve wardrobe slugs and Celsius engine inputs so saved profiles and outfit rules remain compatible.
- Administrator feedback uses a protected role table and RLS; AI analysis produces review-only proposals through a streamed server endpoint and never changes recommendation rules automatically.
- Unfinished toddler (12–35 months) support is gated by `VITE_TODDLER_ROLLOUT` via `src/lib/feature-flags.ts` ("off" default, "preview" = dev/preview server only, "public" = everyone); build-time inlining keeps SSR, hydration, server and MCP paths in agreement, and the switch only hides UI/rules, never data.
- Garment details (insulation, waterproofing, availability, sleepwear shape, foot coverage, wool-leggings use) live as optional columns on `wardrobe_items` and in `wardrobeDetails` of the versioned local profile (`upgradeGuestProfile`); "unknown" means unstated and must never be inferred from the slug. Inventory stays one row per child and slug (UNIQUE baby_id, slug), so duplicates of the same garment type can't be recorded separately; un-owning sets `owned=false` rather than deleting so IDs and details survive.
- Child preferences (clothing style, nappy use, easy toilet access) live as defaulted columns on `babies` and in `preferences` of the versioned local profile (v3, compact non-defaults); they are parent-stated only and never derived from age.
