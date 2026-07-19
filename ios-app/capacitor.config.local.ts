import type { CapacitorConfig } from '@capacitor/cli';

// Local / bundled config: ships the built web app inside the .ipa.
// Use for offline testing or App Review builds where you don't want
// the app to depend on the live URL. Copy this file over
// capacitor.config.ts before running `npx cap sync ios`.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: 'web/dist',
  ios: {
    scheme: 'Layerly',
    contentInset: 'always',
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
