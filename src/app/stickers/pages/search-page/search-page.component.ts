import { I18nPluralPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from 'rxjs';
import { PoweredBy } from '../../../shared/components/powered-by/powered-by';
import { RecentSearches } from '../../components/recent-searches/recent-searches';
import { StickersFeedStatus } from '../../components/stickers-feed-status/stickers-feed-status';
import { StickersList } from '../../components/stickers-list/stickers-list';
import { StickersListSkeleton } from '../../components/stickers-list-skeleton/stickers-list-skeleton';
import { Sticker } from '../../interfaces/sticker.interface';
import { StickersService } from '../../services/stickers.service';
import { appendUniqueStickers } from '../../utils/append-unique-stickers';
import { STICKERS_PLURAL } from '../../utils/sticker-plurals';

interface SearchRequest {
  query: string;
  page: number;
  fromTyping: boolean;
}

// Tiempo que se espera sin escribir antes de buscar solo
const TYPING_DELAY_MS = 500;
// Búsquedas más largas no dan resultados útiles (KLIPY no documenta un máximo)
const MAX_QUERY_LENGTH = 50;

@Component({
  imports: [
    I18nPluralPipe,
    StickersList,
    StickersListSkeleton,
    StickersFeedStatus,
    RecentSearches,
    PoweredBy,
  ],
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
})
export default class SearchPageComponent {
  private readonly stickersService = inject(StickersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // `null` significa "cancela lo que estuvieras buscando"
  private readonly searchRequest$ = new Subject<SearchRequest | null>();
  // `null` anula el texto que estuviera esperando a que dejes de escribir
  private readonly typedText$ = new Subject<string | null>();

  // Página que se pedirá la próxima vez (solo avanza cuando una página llega bien)
  private nextPage = 0;
  // Texto que mandó a la URL la búsqueda en vivo: así se sabe si la URL cambió por escribir o por otra cosa
  private typedQuery: string | null = null;
  private searchFromTyping = false;
  // Lo que se guardaría en el historial: `stickers` puede tener ya más páginas
  private firstPageStickers: Sticker[] = [];

  protected readonly suggestions = ['hola', 'gracias', 'gatos', 'fiesta', 'amor', 'jaja'];
  protected readonly stickersPlural = STICKERS_PLURAL;

  protected readonly query = signal('');
  // Texto de la caja, tal cual (con espacios): no siempre coincide con la búsqueda lanzada
  protected readonly searchText = signal('');
  protected readonly stickers = signal<Sticker[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    // switchMap cancela la petición anterior si se lanza una búsqueda nueva antes de que termine
    this.searchRequest$
      .pipe(
        switchMap((request) =>
          request
            ? this.stickersService
                .searchStickers(request.query, request.page, { fromTyping: request.fromTyping })
                .pipe(
                  map(({ stickers, hasMore }) => ({ stickers, hasMore, page: request.page })),
                  catchError((error: unknown) => {
                    console.error('Failed to search stickers on KLIPY.', error);
                    this.errorMessage.set('No se pudo completar la búsqueda. Inténtalo de nuevo.');
                    this.isLoading.set(false);
                    return EMPTY;
                  }),
                )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ stickers, hasMore, page }) => {
        if (page === 0) {
          this.firstPageStickers = stickers;
          this.stickers.set(stickers);
        } else {
          this.stickers.update((current) => appendUniqueStickers(current, stickers));
        }

        this.hasMore.set(hasMore);
        this.nextPage = page + 1;
        this.isLoading.set(false);
      });

    // La búsqueda vive en la URL (?q=gatos): así se puede recargar la página o compartirla
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('q')?.trim() ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((query) => this.startSearch(query));

    // Buscar mientras escribes: solo cuando dejas de escribir un momento
    this.typedText$
      .pipe(
        debounceTime(TYPING_DELAY_MS),
        filter((text) => text !== null),
        map((text) => text.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((query) => {
        this.typedQuery = query;
        // La búsqueda actual aún no se ha sustituido: si fue a propósito (Enter, sugerencia, URL)
        // se añade una entrada al "atrás"; si salió de escribir, se sustituye
        this.updateUrl(query, this.searchFromTyping);
      });
  }

  protected onType(text: string): void {
    this.searchText.set(text);
    this.typedText$.next(text);
  }

  protected search(rawQuery: string): void {
    const query = rawQuery.trim();

    if (!query) {
      return;
    }

    // Sin esto, una búsqueda en vivo pendiente volvería a cambiar a lo que se estaba escribiendo
    this.typedText$.next(null);
    this.typedQuery = null;
    // Si se repite la búsqueda actual la URL no cambia y startSearch no rellenaría la caja
    this.searchText.set(query);

    // Enter sobre lo que ya buscó la búsqueda en vivo: la URL no cambia, así que se confirma aquí
    if (query === this.query() && this.searchFromTyping) {
      this.searchFromTyping = false;
      this.stickersService.markHistoryEntryExplicit(query, this.firstPageStickers);

      // Si la primera página aún no ha llegado, se guardaría como "de escribir": se pide otra vez
      if (this.isLoading() && this.nextPage === 0) {
        this.requestNextPage();
      }
    }

    this.updateUrl(query, false);
  }

  protected loadNextPage(): void {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }

    this.requestNextPage();
  }

  /**
   * Solo se cambia la URL; al cambiar, `queryParamMap` lanza la búsqueda.
   * `replaceUrl` evita llenar el botón "atrás" del navegador con "g", "ga", "gat"... al escribir.
   */
  private updateUrl(query: string, replaceUrl: boolean): void {
    // `null` quita el ?q= de la URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null },
      replaceUrl,
    });
  }

  private startSearch(rawQuery: string): void {
    // La URL se puede escribir a mano: se recorta igual que la caja (maxlength)
    const query = rawQuery.slice(0, MAX_QUERY_LENGTH).trim();
    this.searchFromTyping = query === this.typedQuery;
    this.typedQuery = null;

    // Búsqueda nueva: se empieza otra vez desde la primera página
    this.query.set(query);
    // Si es lo que ya pone la caja (o viene de escribir) no se toca, para no borrar lo que se está escribiendo
    if (!this.searchFromTyping && this.searchText().trim() !== query) {
      this.searchText.set(query);
      // La URL cambió desde fuera (p. ej. botón "atrás"): lo que se estaba escribiendo ya no vale
      this.typedText$.next(null);
    }
    this.stickers.set([]);
    this.firstPageStickers = [];
    this.errorMessage.set('');
    this.nextPage = 0;

    if (!query) {
      this.hasMore.set(false);
      this.isLoading.set(false);
      this.searchRequest$.next(null);
      return;
    }

    this.hasMore.set(true);
    this.requestNextPage();
  }

  private requestNextPage(): void {
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.searchRequest$.next({
      query: this.query(),
      page: this.nextPage,
      fromTyping: this.searchFromTyping,
    });
  }
}
