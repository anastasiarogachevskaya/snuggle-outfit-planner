import type { CapacitorConfig } from '@capacitor/cli';

// Local / bundled config: ships the built web assets from the repository
// root build (../dist/client) inside the .ipa.
// Use for offline testing or App Review builds where you don't want the app
// to depend on the live URL. Copy this file over capacitor.config.ts before
// running `bun run sync:ios`.
//
// Note: Layerly's web app is server-rendered, so the bundled assets have no
// index.html of their own. Only use this mode with a prerendered/static build.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: '../dist/client',
  backgroundColor: '#A8B894',
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
      style: 'DARK',
      backgroundColor: '#A8B894',
    },
  },
};

export default config;
