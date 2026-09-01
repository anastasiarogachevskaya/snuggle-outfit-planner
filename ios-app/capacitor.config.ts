import type { CapacitorConfig } from '@capacitor/cli';

// PRODUCTION CONFIG — the single source of truth for the shipped iOS app.
//
// The WebView loads the live Layerly website, so iOS renders exactly the same
// React/TanStack routes as the web (landing, auth, onboarding, today). There is
// deliberately no separate native landing/login implementation.
//
// webDir points at ios-app/www, a stable staging folder that `bun run
// prepare:ios` fills with the detected root build output (Nitro currently emits
// dist/client, older versions .output/public). Using a fixed folder means the
// config never breaks when the build tool changes its output path. Those assets
// are NOT what the app renders in this mode — the live URL above is.

//
// To test fully offline/bundled instead, copy capacitor.config.local.ts over this
// file explicitly — never switch silently.
// Google OAuth client IDs (public identifiers, not secrets).
// GOOGLE_IOS_CLIENT_ID  → Google Cloud Console → Credentials → OAuth client, type "iOS"
// GOOGLE_WEB_CLIENT_ID  → the existing Web client (used as audience so the
//                          backend accepts the id_token).
const GOOGLE_IOS_CLIENT_ID = 'REPLACE_WITH_IOS_OAUTH_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = 'REPLACE_WITH_WEB_OAUTH_CLIENT_ID.apps.googleusercontent.com';

const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: 'www',
  backgroundColor: '#A8B894',
  server: {
    url: 'https://layerly.online',
    cleartext: false,
    allowNavigation: [
      'layerly.online',
      '*.layerly.online',
    ],
  },

  ios: {
    scheme: 'layerly',
    contentInset: 'never',
    backgroundColor: '#A8B894',
  },
  plugins: {
    // Native Google Sign-In (no web page, no backend hostname shown).
    // iosClientId is the *iOS* OAuth client ID from Google Cloud Console.
    // The matching reversed client ID must also be a CFBundleURLScheme in
    // ios/App/App/Info.plist, otherwise the sheet never returns.
    GoogleAuth: {
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['profile', 'email'],
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      // Safety net: the web app hides the splash as soon as it boots, but if the
      // remote site stalls or fails, iOS must still drop the splash so the user
      // sees the WebView (and its error state) instead of a blank green screen.
      launchAutoHide: true,
      launchShowDuration: 8000,
      launchFadeOutDuration: 200,
      backgroundColor: '#A8B894',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#A8B894',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
