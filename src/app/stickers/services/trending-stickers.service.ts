import { inject, Injectable, signal } from '@angular/core';
import { Sticker } from '../interfaces/sticker.interface';
import { appendUniqueStickers } from '../utils/append-unique-stickers';
import { StickersService } from './stickers.service';

/**
 * Guarda los stickers en tendencia que ya se han cargado.
 * Al vivir en un servicio (y no en la página), siguen ahí al ir a otra página y volver.
 */
@Injectable({ providedIn: 'root' })
export class TrendingStickersService {
  private readonly stickersService = inject(StickersService);

  private page = 0;

  // Las señales se cambian solo desde aquí dentro; fuera se exponen de solo lectura
  private readonly _stickers = signal<Sticker[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _hasMore = signal(true);
  private readonly _errorMessage = signal('');

  readonly stickers = this._stickers.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  loadNextPage(): void {
    // Evita pedir la misma página dos veces o seguir pidiendo cuando ya no hay más
    if (this._isLoading() || !this._hasMore()) {
      return;
    }

    this._isLoading.set(true);
    this._errorMessage.set('');

    // No hace falta cancelar la suscripción: el servicio vive mientras la app esté abierta
    this.stickersService.getTrendingStickers(this.page).subscribe({
      next: ({ stickers, hasMore }) => {
        this._stickers.update((current) => appendUniqueStickers(current, stickers));
        this._hasMore.set(hasMore);
        this.page++;
        this._isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Failed to load trending stickers from KLIPY.', error);
        this._errorMessage.set('No se pudieron cargar los stickers. Inténtalo de nuevo.');
        this._isLoading.set(false);
      },
    });
  }
}
