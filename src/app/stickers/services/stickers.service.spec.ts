import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KlipySticker } from '../interfaces/klipy-sticker-response.interface';
import { StickersService } from './stickers.service';

// Clave falsa: los tests no llegan a salir a internet
const TEST_KEY = 'clave-de-prueba';
const API_URL = `https://api.klipy.com/api/v1/${TEST_KEY}/stickers`;
const MEDIA = 'https://static.klipy.com/ii/abc';

function createKlipySticker(id: number, type = 'sticker'): KlipySticker {
  return {
    id,
    slug: `sticker-${id}`,
    title: `Sticker ${id}`,
    type,
    file: {
      hd: { gif: { url: `${MEDIA}/${id}-hd.gif` }, webp: { url: `${MEDIA}/${id}-hd.webp` } },
      md: { webp: { url: `${MEDIA}/${id}-md.webp`, width: 200, height: 150 } },
    },
  };
}

describe('StickersService', () => {
  const originalKey = environment.klipyApiKey;
  let http: HttpTestingController;

  function createService(): StickersService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(StickersService);
  }

  beforeEach(() => {
    localStorage.clear();
    environment.klipyApiKey = TEST_KEY;
  });

  afterEach(() => {
    http?.verify();
    environment.klipyApiKey = originalKey;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('asks KLIPY for the trending page (1-based) with the filters and without user ids', async () => {
    const service = createService();

    const result = firstValueFrom(service.getTrendingStickers(2));
    const request = http.expectOne((req) => req.url === `${API_URL}/trending`);
    const params = request.request.params;

    expect(request.request.method).toBe('GET');
    expect(params.get('page')).toBe('3');
    expect(params.get('per_page')).toBe('24');
    expect(params.get('content_filter')).toBe('high');
    expect(params.get('format_filter')).toBe('webp,gif');
    expect(params.get('locale')).toMatch(/^[a-z]{2}$/);
    expect(params.has('q')).toBe(false);
    expect(params.has('customer_id')).toBe(false);

    request.flush({
      result: true,
      data: { data: [createKlipySticker(1), createKlipySticker(2, 'ad')], has_next: false },
    });

    const page = await result;
    expect(page.hasMore).toBe(false);
    expect(page.stickers.map((sticker) => sticker.id)).toEqual(['1']);
  });

  it('sends the query when searching and saves the first page in the history', async () => {
    const service = createService();

    const result = firstValueFrom(service.searchStickers('gatos'));
    const request = http.expectOne((req) => req.url === `${API_URL}/search`);

    expect(request.request.params.get('q')).toBe('gatos');
    expect(request.request.params.get('page')).toBe('1');

    request.flush({ result: true, data: { data: [createKlipySticker(1)], has_next: true } });

    expect((await result).hasMore).toBe(true);
    expect(service.getHistoryStickers('gatos').map((sticker) => sticker.id)).toEqual(['1']);
  });

  it('uses the number of items when KLIPY does not send has_next', async () => {
    const service = createService();

    const withItems = firstValueFrom(service.getTrendingStickers());
    // Una página solo con anuncios no significa que se haya llegado al final
    http.expectOne(() => true).flush({ result: true, data: { data: [createKlipySticker(1, 'ad')] } });
    expect(await withItems).toEqual({ stickers: [], hasMore: true });

    const empty = firstValueFrom(service.getTrendingStickers(1));
    http.expectOne(() => true).flush({ result: true, data: { data: [] } });
    expect((await empty).hasMore).toBe(false);
  });

  it('fails when KLIPY answers with result false', async () => {
    const service = createService();

    const result = firstValueFrom(service.getTrendingStickers());
    http.expectOne(() => true).flush({ result: false, errors: { message: ['Algo falló'] } });

    await expect(result).rejects.toThrow('Algo falló');
  });

  it('fails without calling KLIPY when there is no API key', async () => {
    environment.klipyApiKey = '';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createService();

    await expect(firstValueFrom(service.getTrendingStickers())).rejects.toThrow('Missing KLIPY API key.');
    expect(consoleError).toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('migrates the old GIPHY stickers saved in the history', () => {
    localStorage.setItem(
      'stickers-search-history',
      JSON.stringify([
        {
          query: 'gatos',
          stickers: [
            {
              id: 'abc',
              title: 'Gato',
              imageUrl: 'https://media.giphy.com/abc/200w.webp',
              originalImageUrl: 'https://media.giphy.com/abc/giphy.webp',
              giphyUrl: 'https://giphy.com/stickers/abc',
            },
          ],
        },
      ]),
    );

    const [sticker] = createService().getHistoryStickers('gatos');

    expect(sticker.shareUrl).toBe('https://giphy.com/stickers/abc');
    expect('giphyUrl' in sticker).toBe(false);
  });
});
