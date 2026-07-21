## Plan

1. **Keep Layerly inside the iOS app**
   - Update the Capacitor iOS config so the app loads the canonical `layerly.online` origin and allows all Layerly/auth hosts needed for redirects.
   - Change iOS safe-area behavior from forced inset handling to WebView-friendly behavior to avoid the blank shell / odd scrolling effect.
   - Add a native background color matching Layerly so launch-to-web rendering does not flash black/white.

2. **Remove WebView horizontal overflow**
   - Audit the mobile layout wrappers for elements wider than the viewport.
   - Add global mobile-safe sizing (`box-sizing`, constrained body/root width, overflow clipping) without changing the visual design.
   - Patch any route-level mobile layout that can exceed the viewport, especially authenticated mobile screens like Today/Wardrobe.

3. **Make the installed app feel native on iOS**
   - Ensure the web shell uses safe-area-aware spacing only where needed, not duplicated by Capacitor and CSS at the same time.
   - Keep the max-width mobile-first app layout centered, but prevent horizontal scroll indicators.

4. **Validation steps for you after implementation**
   - Run `npx cap sync ios` from `ios-app/`.
   - In Xcode: Product → Clean Build Folder → Run.
   - Confirm tapping the Layerly app stays inside the simulator app, does not open Safari, and shows no horizontal scrollbar.