# Wider illustrated blog

Update the public blog index using the selected **Playful editorial grid** direction.

## Blog index

- Keep the current single-column layout on phones.
- Expand the page on larger screens: two columns on tablets and three columns on desktop, within a wide centered container.
- Turn each post preview into a fully clickable editorial card with a stable image area, date, title, summary, and clear reading affordance.
- Keep the cards compact, readable, and visually aligned even when titles and summaries differ in length.

## Playful artwork

- Give every existing post a distinct, custom flat illustration tied to its subject, such as a bodysuit, wardrobe, location/weather symbol, shield, App Store phone, or layered outfit.
- Draw the artwork as lightweight inline icon illustrations so it stays crisp at every screen size and requires no external image downloads.
- Use Layerly’s existing sage, clay, canvas, and ink palette, with a few soft supporting tints defined as reusable design tokens.
- Add a restrained lift and illustration scale effect on pointer hover, disabled when reduced motion is requested.

## Page continuity

- Retain the existing Layerly header, footer, newest-first post order, call to action, metadata, and sitemap behavior.
- Keep individual article pages narrow and comfortable to read; only their shared header/footer width may be aligned where necessary.
- Verify the result at phone, tablet, and desktop sizes, including long titles and the final incomplete grid row.

## Technical notes

- Extend the blog post presentation data with a safe illustration theme or derive it from each known post slug.
- Build a small reusable blog-card illustration component rather than embedding repeated markup in the page.
- Add semantic illustration color tokens to the global theme; avoid hardcoded page colors.
- Confirm the preview compiles cleanly and visually matches the approved direction.
