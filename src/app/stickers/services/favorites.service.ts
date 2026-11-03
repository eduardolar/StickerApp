import { computed, effect, Injectable, signal } from '@angular/core';
import { readFromLocalStorage, saveToLocalStorage } from '../../shared/utils/local-storage';
import { Sticker } from '../interfaces/sticker.interface';
import { migrateStoredStickers } from '../utils/migrate-stored-stickers';

const FAVORITES_STORAGE_KEY = 'stickers-favorites';

function loadFavoritesFromLocalStorage(): Sticker[] {
  const stored = readFromLocalStorage<unknown>(FAVORITES_STORAGE_KEY, []);
  return migrateStoredStickers(stored);
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _favorites = signal<Sticker[]>(loadFavoritesFromLocalStorage());
  readonly favorites = this._favorites.asReadonly();

  // Un Set permite comprobar muy rápido si un id está dentro
  private readonly favoriteIds = computed(() => new Set(this._favorites().map((sticker) => sticker.id)));

  private readonly saveFavoritesToLocalStorage = effect(() => {
    saveToLocalStorage(FAVORITES_STORAGE_KEY, this._favorites());
  });

  isFavorite(stickerId: string): boolean {
    return this.favoriteIds().has(stickerId);
  }

  /** Si el sticker ya era favorito lo quita; si no, lo añade el primero */
  toggle(sticker: Sticker): void {
    this._favorites.update((favorites) =>
      this.isFavorite(sticker.id)
        ? favorites.filter((favorite) => favorite.id !== sticker.id)
        : [sticker, ...favorites],
    );
  }
}
