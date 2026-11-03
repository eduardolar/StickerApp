import { I18nPluralPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StickersList } from '../../components/stickers-list/stickers-list';
import { FavoritesService } from '../../services/favorites.service';
import { SAVED_STICKERS_PLURAL } from '../../utils/sticker-plurals';

@Component({
  imports: [I18nPluralPipe, RouterLink, StickersList],
  selector: 'app-favorites-page',
  templateUrl: './favorites-page.component.html',
})
export default class FavoritesPageComponent {
  protected readonly favoritesService = inject(FavoritesService);
  protected readonly savedStickersPlural = SAVED_STICKERS_PLURAL;

  // El filtro es solo de esta pantalla: los favoritos siguen guardados en FavoritesService
  protected readonly filterText = signal('');
  protected readonly normalizedFilter = computed(() => this.filterText().trim().toLowerCase());
  protected readonly filteredFavorites = computed(() => {
    const text = this.normalizedFilter();
    const favorites = this.favoritesService.favorites();

    return text
      ? favorites.filter((sticker) => sticker.title.toLowerCase().includes(text))
      : favorites;
  });
}
