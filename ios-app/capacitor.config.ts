import type { CapacitorConfig } from '@capacitor/cli';

// Production config: the app loads the live web app so web deploys
// ship instantly without an App Store release.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: 'web/dist',
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
