import type { CapacitorConfig } from '@capacitor/cli';

// Production config: the app loads the live web app so web deploys
// ship instantly without an App Store release.
// webDir points at the root build's static output (TanStack Start + Nitro
// currently emits ../dist/client) so `cap sync` has a valid local directory
// even in server mode. `bun run prepare:ios` verifies this path against the
// build manifest and warns if the build output ever moves.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: '../dist/client',
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
