import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { readFromLocalStorage, saveToLocalStorage } from '../../shared/utils/local-storage';
import { KlipyStickerResponse } from '../interfaces/klipy-sticker-response.interface';
import { SearchHistoryEntry } from '../interfaces/search-history-entry.interface';
import { Sticker } from '../interfaces/sticker.interface';
import { StickersPage } from '../interfaces/stickers-page.interface';
import { mapKlipyStickersToStickers } from '../mappers/klipy-sticker.mapper';
import { addSearchToHistory, confirmSearchInHistory } from '../utils/add-search-to-history';
import { getKlipyLocale } from '../utils/get-klipy-locale';
import { migrateStoredStickers } from '../utils/migrate-stored-stickers';

const HISTORY_STORAGE_KEY = 'stickers-search-history';
const MAX_HISTORY_ENTRIES = 10;
const KLIPY_API_URL = 'https://api.klipy.com/api/v1';
const STICKERS_PAGE_SIZE = 24;
// 'high' = el filtro más estricto de KLIPY
const STICKERS_CONTENT_FILTER = 'high';
// Solo los formatos que usa la app: así la respuesta no trae vídeos ni PNG
const STICKERS_FORMAT_FILTER = 'webp,gif';

function readHistoryFromLocalStorage(): SearchHistoryEntry[] {
  const stored = readFromLocalStorage<unknown>(HISTORY_STORAGE_KEY, []);

  if (Array.isArray(stored)) {
    return stored as SearchHistoryEntry[];
  }

  // Las versiones anteriores guardaban un objeto { "gatos": [...] }: se pasa al formato nuevo
  if (stored && typeof stored === 'object') {
    return Object.entries(stored as Record<string, Sticker[]>)
      .map(([query, stickers]) => ({ query, stickers }))
      .slice(0, MAX_HISTORY_ENTRIES);
  }

  return [];
}

function loadHistoryFromLocalStorage(): SearchHistoryEntry[] {
  return readHistoryFromLocalStorage().map((entry) => ({
    ...entry,
    stickers: migrateStoredStickers(entry.stickers),
  }));
}

@Injectable({ providedIn: 'root' })
export class StickersService {
  private readonly http = inject(HttpClient);
  private readonly locale = getKlipyLocale(navigator.language);

  // Lista ordenada: la búsqueda más reciente va la primera
  readonly searchHistory = signal<SearchHistoryEntry[]>(loadHistoryFromLocalStorage());
  readonly searchHistoryKeys = computed(() => this.searchHistory().map((entry) => entry.query));

  private readonly saveHistoryToLocalStorage = effect(() => {
    saveToLocalStorage(HISTORY_STORAGE_KEY, this.searchHistory());
  });

  /** `page` empieza en 0; cada página trae STICKERS_PAGE_SIZE stickers */
  getTrendingStickers(page = 0): Observable<StickersPage> {
    return this.getStickersPage('trending', page);
  }

  /**
   * `page` empieza en 0; cada página trae STICKERS_PAGE_SIZE stickers.
   * `fromTyping`: la búsqueda se lanzó sola al escribir (cambia cómo se guarda en el historial).
   */
  searchStickers(
    query: string,
    page = 0,
    { fromTyping = false }: { fromTyping?: boolean } = {},
  ): Observable<StickersPage> {
    return this.getStickersPage('search', page, query).pipe(
      tap(({ stickers }) => {
        // Solo se guarda la primera página para no llenar el localStorage
        if (page === 0) {
          this.addToHistory(query, stickers, fromTyping);
        }
      }),
    );
  }

  getHistoryStickers(query: string): Sticker[] {
    const key = query.toLowerCase();
    return this.searchHistory().find((entry) => entry.query === key)?.stickers ?? [];
  }

  // No hace falta tocar el localStorage aquí: el effect lo guarda solo al cambiar la señal
  removeFromHistory(query: string): void {
    const key = query.toLowerCase();
    this.searchHistory.update((history) => history.filter((entry) => entry.query !== key));
  }

  clearHistory(): void {
    this.searchHistory.set([]);
  }

  /**
   * Se pulsó Enter sobre lo que ya había buscado la búsqueda en vivo: ya no se puede sustituir.
   * `firstPageStickers` sirve para guardarla si no llegó a entrar en el historial.
   */
  markHistoryEntryExplicit(query: string, firstPageStickers: Sticker[]): void {
    this.searchHistory.update((history) =>
      confirmSearchInHistory(history, { query, stickers: firstPageStickers }, MAX_HISTORY_ENTRIES),
    );
  }

  private getStickersPage(
    endpoint: 'trending' | 'search',
    page: number,
    query?: string,
  ): Observable<StickersPage> {
    const apiKey = environment.klipyApiKey;

    // Sin clave KLIPY responde con un error genérico: mejor avisar claro y no hacer la petición
    if (!apiKey || apiKey === 'TU_API_KEY_DE_KLIPY') {
      console.error('Missing KLIPY API key: set klipyApiKey in src/environments/environment*.ts.');
      return throwError(() => new Error('Missing KLIPY API key.'));
    }

    // KLIPY numera las páginas desde 1
    let params = new HttpParams()
      .set('page', page + 1)
      .set('per_page', STICKERS_PAGE_SIZE)
      .set('locale', this.locale)
      .set('content_filter', STICKERS_CONTENT_FILTER)
      .set('format_filter', STICKERS_FORMAT_FILTER);

    if (query !== undefined) {
      params = params.set('q', query);
    }

    return this.http
      .get<KlipyStickerResponse>(
        `${KLIPY_API_URL}/${encodeURIComponent(apiKey)}/stickers/${endpoint}`,
        { params },
      )
      .pipe(
        map((response) => {
          if (!response.result || !response.data) {
            throw new Error(`KLIPY responded with an error: ${response.errors?.message?.join(' ') ?? 'no data'}`);
          }

          const items = response.data.data ?? [];
          return {
            stickers: mapKlipyStickersToStickers(items),
            // Se cuentan los elementos sin filtrar: una página solo con descartados no es el final
            hasMore: response.data.has_next ?? items.length > 0,
          };
        }),
      );
  }

  private addToHistory(query: string, stickers: Sticker[], fromTyping: boolean): void {
    this.searchHistory.update((history) =>
      addSearchToHistory(
        history,
        { query, stickers },
        { fromTyping, maxEntries: MAX_HISTORY_ENTRIES },
      ),
    );
  }
}
