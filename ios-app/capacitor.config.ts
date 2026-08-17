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
