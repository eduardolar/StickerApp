import { Component, computed, DestroyRef, inject, input, linkedSignal, signal } from '@angular/core';
import { Sticker } from '../../interfaces/sticker.interface';
import { FavoritesService } from '../../services/favorites.service';
import { StickerShareService } from '../../services/sticker-share.service';

/** Botones de un sticker: favorito, copiar enlace, enviar por WhatsApp y descargar */
@Component({
  selector: 'app-sticker-actions',
  templateUrl: './sticker-actions.html',
})
export class StickerActions {
  private readonly stickerShareService = inject(StickerShareService);
  private readonly favoritesService = inject(FavoritesService);

  readonly sticker = input.required<Sticker>();
  // En las tarjetas de la lista: en pantallas táctiles se esconden Copiar y Descargar
  readonly compact = input(false);

  protected readonly isBusy = signal(false);
  // Vuelve a 'idle' al cambiar de sticker: en el diálogo este componente se reutiliza al pasar al siguiente
  protected readonly copyStatus = linkedSignal<Sticker, 'idle' | 'copied' | 'error'>({
    source: this.sticker,
    computation: () => 'idle',
  });
  protected readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.sticker().id));

  private copyStatusTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copyStatusTimeout));
  }

  protected toggleFavorite(): void {
    this.favoritesService.toggle(this.sticker());
  }

  protected async copyLink(): Promise<void> {
    const sticker = this.sticker();
    let status: 'copied' | 'error';

    try {
      await this.stickerShareService.copyLink(sticker);
      status = 'copied';
    } catch (error: unknown) {
      console.error('Failed to copy sticker link.', error);
      status = 'error';
    }

    // Si mientras se copiaba se pasó a otro sticker (flechas del diálogo), el aviso no es suyo
    if (this.sticker() !== sticker) {
      return;
    }

    this.copyStatus.set(status);

    // El aviso de "copiado" desaparece a los 2 segundos
    clearTimeout(this.copyStatusTimeout);
    this.copyStatusTimeout = setTimeout(() => this.copyStatus.set('idle'), 2000);
  }

  protected prefetch(): void {
    this.stickerShareService.prefetch(this.sticker());
  }

  protected async shareOnWhatsApp(): Promise<void> {
    await this.runAction(() => this.stickerShareService.shareOnWhatsApp(this.sticker()));
  }

  protected async download(): Promise<void> {
    await this.runAction(() => this.stickerShareService.download(this.sticker()));
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);

    try {
      await action();
    } finally {
      this.isBusy.set(false);
    }
  }
}
