import type { CapacitorConfig } from '@capacitor/cli';

// PRODUCTION CONFIG — the single source of truth for the shipped iOS app.
//
// The WebView loads the live Layerly website, so iOS renders exactly the same
// React/TanStack routes as the web (landing, auth, onboarding, today). There is
// deliberately no separate native landing/login implementation.
//
// webDir points at the root build's static output (Nitro emits ../.output/public)
// only so `cap sync` has a valid local directory; those assets are NOT what the
// app renders in this mode. `bun run prepare:ios` verifies this path against the
// build manifest and verifies that the synced native config kept `server.url`.
//
// To test fully offline/bundled instead, copy capacitor.config.local.ts over this
// file explicitly — never switch silently.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: '../.output/public',
  backgroundColor: '#A8B894',
  server: {
    url: 'https://layerly.online',
    cleartext: false,
    allowNavigation: [
      'layerly.online',
      'www.layerly.online',
      '*.layerly.online',
      '*.lovable.app',
      '*.supabase.co',
      'accounts.google.com',
      'appleid.apple.com',
    ],
  },

  ios: {
    scheme: 'Layerly',
    contentInset: 'never',
    backgroundColor: '#A8B894',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
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
