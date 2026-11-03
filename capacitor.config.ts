import type { CapacitorConfig } from '@capacitor/cli';

// No añadir androidScheme: cambiaría el origen de la web y se perderían los datos de localStorage
const config: CapacitorConfig = {
  appId: 'com.eduardolara.stickerapp',
  appName: 'StickerApp', // nombre bajo el icono (el título de Play es "StickerApp: stickers animados"); se puede cambiar, el appId NO
  webDir: 'dist/sticker-app/browser',
  backgroundColor: '#020617',
  plugins: {
    SystemBars: { insetsHandling: 'css', style: 'DARK', initialViewportFitValueHint: 'cover' },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: '#020617',
      showSpinner: false,
    },
  },
};

export default config;
