import type { CapacitorConfig } from '@capacitor/cli';

// Local / bundled config: ships the built static web assets from the root
// build inside the .ipa. `bun run prepare:ios` stages them into ios-app/www.

// Use for offline testing or App Review builds where you don't want the app
// to depend on the live URL. Copy this file over capacitor.config.ts before
// running `bun run sync:ios` — this is an explicit opt-in, never automatic.
//
// Note: Layerly's web app is server-rendered, so the bundled assets have no
// index.html of their own. Only use this mode with a prerendered/static build,
// otherwise the WebView shows stale or non-hydrating markup (nothing clickable).
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: 'www',

  backgroundColor: '#A8B894',
  ios: {
    scheme: 'layerly',
    contentInset: 'never',
    backgroundColor: '#A8B894',
  },
  plugins: {
    SplashScreen: {
      // Safety net: hide automatically if the bundled app never boots.
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
