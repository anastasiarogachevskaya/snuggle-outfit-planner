import type { CapacitorConfig } from '@capacitor/cli';

// Production config: the app loads the live web app so web deploys
// ship instantly without an App Store release.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: 'web/dist',
  server: {
    url: 'https://www.layerly.online',
    cleartext: false,
  },
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
