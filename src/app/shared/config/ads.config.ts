import { MaxAdContentRating } from '@capacitor-community/admob';

/**
 * Bloques de anuncios de PRUEBA de Google: siempre devuelven anuncios de prueba y se pueden pulsar sin riesgo.
 * https://developers.google.com/admob/android/test-ads
 */
const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/9214589741',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

/**
 * Bloques de anuncios REALES: pega aquí los de AdMob (AdMob > Apps > Bloques de anuncios).
 * El ID de la app (el que lleva "~") NO va aquí: va en android/app/src/main/res/values/strings.xml.
 */
const REAL_AD_UNITS = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

/**
 * Deja useTestAds en true hasta que AdMob haya aprobado la app real, y desactívalo solo para la
 * versión que se sube a Play. Pulsar tus propios anuncios reales (o enseñarlos en desarrollo)
 * cuenta como tráfico no válido y Google puede cerrar la cuenta de AdMob.
 */
const useTestAds = true;
const adUnits = useTestAds ? TEST_AD_UNITS : REAL_AD_UNITS;

export const ADS_CONFIG = {
  useTestAds,
  bannerAdUnitId: adUnits.banner,
  interstitialAdUnitId: adUnits.interstitial,
  /** Como mucho un intersticial cada 3 minutos */
  interstitialMinIntervalMs: 3 * 60 * 1000,
  /** Ningún intersticial durante el primer minuto tras abrir la app */
  interstitialFirstDelayMs: 60 * 1000,
  /** Una oportunidad (compartir/guardar) sin usar caduca a los 2 minutos */
  interstitialOpportunityMaxAgeMs: 2 * 60 * 1000,
  /** Equivale a "PG": anuncios aptos para casi todos los públicos */
  maxAdContentRating: MaxAdContentRating.ParentalGuidance,
} as const;
