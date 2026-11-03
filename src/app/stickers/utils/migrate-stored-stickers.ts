import { Sticker } from '../interfaces/sticker.interface';

/** Sticker tal y como pudo quedar guardado: las versiones con GIPHY usaban `giphyUrl` en vez de `shareUrl` */
type StoredSticker = Omit<Sticker, 'shareUrl'> & { shareUrl?: string; giphyUrl?: string };

function migrateStoredSticker(stored: StoredSticker): Sticker {
  const { giphyUrl, ...sticker } = stored;
  return { ...sticker, shareUrl: stored.shareUrl ?? giphyUrl ?? stored.originalImageUrl };
}

/**
 * Pasa al formato actual los stickers leídos del localStorage (favoritos o historial).
 * Si lo guardado no es una lista devuelve [], y se salta lo que no sea un objeto.
 */
export function migrateStoredStickers(stored: unknown): Sticker[] {
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter((item): item is StoredSticker => !!item && typeof item === 'object')
    .map(migrateStoredSticker);
}
