import { Sticker } from '../interfaces/sticker.interface';

/**
 * Añade los stickers nuevos al final de la lista, saltándose los que ya estaban.
 * La API a veces repite stickers entre páginas y el @for necesita ids únicos.
 */
export function appendUniqueStickers(current: Sticker[], incoming: Sticker[]): Sticker[] {
  const currentIds = new Set(current.map((sticker) => sticker.id));
  return [...current, ...incoming.filter((sticker) => !currentIds.has(sticker.id))];
}
