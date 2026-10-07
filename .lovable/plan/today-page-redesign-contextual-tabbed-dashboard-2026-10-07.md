# Today page redesign — Contextual Tabbed Dashboard

Split the crowded Today page into three calm tabs under a fixed weather card, with "Layer up" pinned at the bottom.

## Layout (phone)

```text
Helsinki                         (M)
+----------------------------------+
| Now 11°  Clear                   |  weather card (tappable "Now"
| Feels like 7° · Outdoors   [sun] |  keeps the time picker on walks)
+----------------------------------+
[ Activity | Outfit | Review ]       segmented tabs, Outfit by default
--------------------------------------
 tab content (scrolls)
--------------------------------------
| Layer up                     [+] |  pinned bar (hidden while sleeping)
```

## Tabs

- **Activity** — Home / Walk / Car cards, and for walks: travel (pram/stroller/carrier) + duration; for home: activity + room temperature. Changing anything jumps back to Outfit.
- **Outfit** (default) — italic serif headline ("Go with layers."), one-line reason, notes, clothing rows (outerwear row highlighted in sage), "Suggested for next time" in clay with an Add link to the wardrobe. A small summary chip ("Walk · Stroller · 30 min") above the headline links to Activity.
- **Review** — the "How was today's outfit?" feedback (hidden while planning ahead), plus Wardrobe, Baby profile and the secondary action links moved here from the bottom row.

## Other changes

- Guest notice becomes a one-line note in Review instead of a banner at the top.
- Website footer (blog/guides links) removed from the Today page — it stays on public pages.
- "Layer up" opens the existing outfit check as today; the pinned bar hides while it's open.
- Keep the current sage/cream palette, serif headings and fonts — no new colors.

## Technical details

- `src/components/today-screen/index.tsx`: add `tab` state (`"activity" | "outfit" | "review"`), render a new `today-tabs.tsx` segmented control, regroup existing components per tab; replace the large Layer up card with a sticky bottom bar (`sticky bottom-0`, safe-area padding).
- `weather-summary.tsx`: restyle into the card (temp large serif, condition, feels like + context, weather icon tile); keep `timeSelector` prop.
- `outfit-result.tsx`: restyle rows per prototype (white rows, sage dot, highlighted outer layer, clay suggestion block).
- Log `today_tab_viewed` analytics event (register in allowed event names).
- No logic changes to recommendations, feedback, or the time picker. Verify on 390px with Playwright for walk, home, car and sleep states.
