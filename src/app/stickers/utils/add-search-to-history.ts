import { SearchHistoryEntry } from '../interfaces/search-history-entry.interface';

export interface AddSearchToHistoryOptions {
  /** La búsqueda se lanzó sola mientras se escribía (no con Enter, una sugerencia o la URL) */
  fromTyping: boolean;
  maxEntries: number;
}

/**
 * Devuelve el historial con la búsqueda añadida la primera (la más reciente).
 * No modifica el array recibido; si no hay nada que guardar devuelve el mismo array.
 */
export function addSearchToHistory(
  history: SearchHistoryEntry[],
  entry: SearchHistoryEntry,
  { fromTyping, maxEntries }: AddSearchToHistoryOptions,
): SearchHistoryEntry[] {
  // Una búsqueda sin resultados no sirve de nada en el historial
  if (entry.stickers.length === 0) {
    return history;
  }

  const key = entry.query.toLowerCase();
  const [latest] = history;
  let previous = history;

  // Al escribir se busca cada vez que paras un momento: sin esto quedarían "g", "ga", "gat"...
  if (fromTyping && latest !== undefined && latest.query !== key) {
    // "gatos" → "gat": estás borrando letras, no es una búsqueda nueva
    if (latest.query.startsWith(key)) {
      return history;
    }

    // "gat" → "gatos": has seguido escribiendo, así que se sustituye en vez de añadir otra.
    // Solo si la anterior también salió de escribir: una búsqueda con Enter no se pierde
    if (key.startsWith(latest.query) && latest.fromTyping === true) {
      previous = history.slice(1);
    }
  }

  // Si ya se había buscado a propósito, volver a escribirla no la convierte en sustituible
  const existing = history.find((item) => item.query === key);
  const keepsFromTyping = fromTyping && (existing === undefined || existing.fromTyping === true);

  // Si ya estaba, se quita de su sitio antiguo para no repetirla
  return [
    { query: key, stickers: entry.stickers, fromTyping: keepsFromTyping },
    ...previous.filter((item) => item.query !== key),
  ].slice(0, maxEntries);
}

/**
 * Se confirmó con Enter lo que ya había buscado la búsqueda en vivo.
 * Si está en el historial deja de ser sustituible; si no (p. ej. se llegó borrando letras
 * y no se guardó), se añade como búsqueda a propósito con los stickers ya cargados.
 */
export function confirmSearchInHistory(
  history: SearchHistoryEntry[],
  entry: SearchHistoryEntry,
  maxEntries: number,
): SearchHistoryEntry[] {
  const key = entry.query.toLowerCase();
  const existing = history.find((item) => item.query === key);

  if (existing === undefined) {
    return addSearchToHistory(history, entry, { fromTyping: false, maxEntries });
  }

  return existing.fromTyping
    ? history.map((item) => (item === existing ? { ...item, fromTyping: false } : item))
    : history;
}
