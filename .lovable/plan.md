# Ship and verify the iOS Geolocation diagnostics release

## Confirmed diagnosis

The native wrapper is loading and rendering `https://layerly.online` correctly. The supplied log proves Capacitor App, StatusBar, SplashScreen, Keyboard, and Haptics bridge calls work, but it contains no `[location]` entries or `To Native -> Geolocation ...` calls.

The production site currently returns 404 for `/diagnostics`, and its shipped JavaScript bundle contains none of the current location diagnostic markers (`getCurrentLocation entered`, `force override applied`, or `import @capacitor/geolocation`). Those files are present in the repository. The iPhone is therefore executing an older published web release, so rebuilding the native shell alone cannot expose the new Geolocation path.

## Actions

1. **Validate the current source before release**
   - Run the location unit tests, TypeScript check, and focused guest-location browser test.
   - Confirm the native project still includes `CapacitorGeolocation` and `NSLocationWhenInUseUsageDescription`.

2. **Make release identity unambiguous**
   - Ensure the web build exposes a non-`unknown` build identifier in the native startup log and Diagnostics screen.
   - Add a clear stale-release warning to Diagnostics when the expected location instrumentation is unavailable, without logging coordinates or secrets.

3. **Publish the current web release**
   - Update the live Layerly site so `/diagnostics` and the instrumented `getCurrentLocation({ force: true })` flow are actually served to the live-site Capacitor wrapper.
   - Verify the live `/diagnostics` route resolves and the production JavaScript contains the expected location markers.

4. **Re-test the exact iOS path**
   - Relaunch the app, open `/try`, and tap **Use my current location**.
   - Require this sequence in Xcode: location entry → forced-live override → plugin import → `Geolocation checkPermissions` → optional `requestPermissions` → `getCurrentPosition` → final outcome.
   - Confirm the button settles and manual city search remains available on denial, restriction, disabled services, or timeout.

5. **Treat unrelated console warnings separately**
   - Record the WebKit networking, RTI keyboard, and Simulator haptic-library messages as non-blocking platform/Simulator noise; they do not explain the missing Geolocation calls.
   - Adjust splash configuration so the app hides it intentionally rather than after the automatic timeout.
   - Migrate the native app to the UIScene lifecycle in a contained native change, preserving Capacitor URL/deep-link forwarding and debug diagnostics.

## Success criteria

- `https://layerly.online/diagnostics` loads the Diagnostics screen.
- Native startup reports a concrete build identifier.
- A location-button tap produces native Geolocation bridge calls and always reaches a terminal UI state.
- No automatic location prompt occurs at launch.
- Splash timeout warning is gone, and the UIScene migration preserves normal launch and deep links.
