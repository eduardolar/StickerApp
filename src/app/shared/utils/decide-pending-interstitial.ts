import { canShowInterstitial, InterstitialTiming } from './can-show-interstitial';

export interface PendingInterstitialState extends InterstitialTiming {
  /** Cuándo se compartió o guardó el sticker que dio la oportunidad, o `null` si no hay ninguna pendiente */
  opportunityAt: number | null;
  /** Cuándo volvió la app a primer plano por última vez (p. ej. al volver de WhatsApp), o `null` si nunca salió */
  resumedAt: number | null;
  /** Tiempo de calma tras la oportunidad o tras volver a la app: deja leer el aviso de "Guardado..." */
  quietMs: number;
  /** Pasado este tiempo desde la oportunidad, ya no se enseña: el anuncio no vendría a cuento */
  maxAgeMs: number;
}

/**
 * - `none`: no hay nada pendiente.
 * - `wait`: todavía no; se guarda la oportunidad para el siguiente cambio de pantalla.
 * - `discard`: la oportunidad caducó o el límite de frecuencia no lo permite; se descarta.
 * - `show`: se enseña ahora.
 */
export type PendingInterstitialDecision = 'none' | 'wait' | 'discard' | 'show';

/** Qué hacer con un intersticial pendiente al llegar un cambio natural de pantalla (cerrar el sticker, navegar) */
export function decidePendingInterstitial(state: PendingInterstitialState): PendingInterstitialDecision {
  const { now, opportunityAt, resumedAt, quietMs, maxAgeMs } = state;

  if (opportunityAt === null) {
    return 'none';
  }

  if (now - opportunityAt > maxAgeMs) {
    return 'discard';
  }

  const lastInterruption = Math.max(opportunityAt, resumedAt ?? opportunityAt);

  if (now - lastInterruption < quietMs) {
    return 'wait';
  }

  return canShowInterstitial(state) ? 'show' : 'discard';
}
