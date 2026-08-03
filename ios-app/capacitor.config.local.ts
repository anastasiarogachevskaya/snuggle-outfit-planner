import type { CapacitorConfig } from '@capacitor/cli';
import { relativeWebOutputDir } from './scripts/detect-web-output.mjs';

// Local / bundled config: ships the built static web assets from the root build
// inside the .ipa. The output directory is detected from the build manifest
// (currently dist/client; .output/public is also supported).
// Use for offline testing or App Review builds where you don't want the app
// to depend on the live URL. Copy this file over capacitor.config.ts before
// running `bun run sync:ios`.
//
// Note: Layerly's web app is server-rendered, so the bundled assets have no
// index.html of their own. Only use this mode with a prerendered/static build.
const config: CapacitorConfig = {
  appId: 'online.layerly.app',
  appName: 'Layerly',
  webDir: relativeWebOutputDir(import.meta.dirname) ?? '../dist/client',
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
