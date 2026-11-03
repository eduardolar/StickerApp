import { Sticker } from './sticker.interface';

/** Una búsqueda del historial: lo que se buscó y los stickers que salieron */
export interface SearchHistoryEntry {
  query: string;
  stickers: Sticker[];
  /**
   * La búsqueda se lanzó sola al escribir. Solo estas se pueden sustituir al seguir escribiendo.
   * Las guardadas antes no lo tienen y cuentan como búsquedas hechas a propósito.
   */
  fromTyping?: boolean;
}
