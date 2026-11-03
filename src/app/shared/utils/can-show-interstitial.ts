export interface InterstitialTiming {
  /** Momento actual (ms, como Date.now()) */
  now: number;
  /** Cuándo arrancó la app */
  appStartedAt: number;
  /** Cuándo se enseñó el último intersticial, o `null` si aún no se ha enseñado ninguno */
  lastShownAt: number | null;
  /** Tiempo mínimo entre dos intersticiales */
  minIntervalMs: number;
  /** Tiempo sin intersticiales nada más abrir la app */
  firstDelayMs: number;
}

/** Límite de frecuencia de los intersticiales: ni recién abierta la app ni demasiado seguidos */
export function canShowInterstitial({
  now,
  appStartedAt,
  lastShownAt,
  minIntervalMs,
  firstDelayMs,
}: InterstitialTiming): boolean {
  if (now - appStartedAt < firstDelayMs) {
    return false;
  }

  return lastShownAt === null || now - lastShownAt >= minIntervalMs;
}
