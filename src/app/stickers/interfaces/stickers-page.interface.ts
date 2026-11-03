import { Sticker } from './sticker.interface';

/** Una página de resultados de la API */
export interface StickersPage {
  stickers: Sticker[];
  /** Hay más páginas después de esta */
  hasMore: boolean;
}
