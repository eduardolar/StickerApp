import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Sticker } from '../interfaces/sticker.interface';

/** "/dashboard/search?q=gatos" → "/dashboard/search" */
function getPath(url: string): string {
  return url.split('?')[0];
}

/**
 * Sticker que se está viendo en grande. Hay un solo diálogo en el dashboard (y no uno por tarjeta)
 * para que no desaparezca de golpe si su tarjeta se quita de la lista, p. ej. al quitarlo de favoritos.
 */
@Injectable({ providedIn: 'root' })
export class StickerDialogService {
  // Lista desde la que se abrió, para poder pasar al anterior / siguiente
  private readonly _list = signal<Sticker[]>([]);
  private readonly _index = signal(-1);

  readonly selected = computed<Sticker | null>(() => this._list()[this._index()] ?? null);
  readonly hasPrevious = computed(() => this._index() > 0);
  readonly hasNext = computed(() => this._index() >= 0 && this._index() < this._list().length - 1);
  /** "3 / 24" */
  readonly position = computed(() => `${this._index() + 1} / ${this._list().length}`);

  constructor() {
    const router = inject(Router);

    // El diálogo ya no vive dentro de la página: al navegar (p. ej. botón "atrás") hay que cerrarlo a mano.
    // Si solo cambia ?q= no se cierra: la búsqueda en vivo lo cambia ('imperative') y lo cerraría nada más
    // abrirlo. Con "atrás"/"adelante" ('popstate') sí, aunque solo cambie ?q=
    router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        filter(
          (event) =>
            event.navigationTrigger === 'popstate' || getPath(event.url) !== getPath(router.url),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close());
  }

  /**
   * Se guarda una copia de la lista tal como está al abrir: los stickers que cargue después
   * el scroll infinito no entran (y quitar un favorito no cambia la posición del diálogo).
   */
  open(sticker: Sticker, list: Sticker[] = [sticker]): void {
    const index = list.findIndex((item) => item.id === sticker.id);

    if (index === -1) {
      this._list.set([sticker]);
      this._index.set(0);
      return;
    }

    this._list.set([...list]);
    this._index.set(index);
  }

  previous(): void {
    if (this.hasPrevious()) {
      this._index.update((index) => index - 1);
    }
  }

  next(): void {
    if (this.hasNext()) {
      this._index.update((index) => index + 1);
    }
  }

  close(): void {
    this._list.set([]);
    this._index.set(-1);
  }
}
