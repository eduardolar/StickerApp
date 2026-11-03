const DEFAULT_LOCALE = 'es';

/**
 * KLIPY pide el país (ISO 3166 alfa-2, p. ej. "mx") para dar prioridad a los stickers de la zona.
 * Se saca de la región del idioma del navegador ("es-MX" → "mx"); sin región se usa "es".
 */
export function getKlipyLocale(language: string | undefined): string {
  try {
    const region = language ? new Intl.Locale(language).region : undefined;
    return region && /^[A-Z]{2}$/.test(region) ? region.toLowerCase() : DEFAULT_LOCALE;
  } catch {
    // Etiqueta de idioma no válida
    return DEFAULT_LOCALE;
  }
}
