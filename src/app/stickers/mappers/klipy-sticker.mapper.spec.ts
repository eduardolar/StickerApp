import { KlipySticker } from '../interfaces/klipy-sticker-response.interface';
import { mapKlipyStickersToStickers } from './klipy-sticker.mapper';

const MEDIA = 'https://static.klipy.com/ii/abc';

function createKlipySticker(overrides: Partial<KlipySticker> = {}): KlipySticker {
  return {
    id: 6914457558367152,
    slug: 'hola-sticker',
    title: 'Hola',
    type: 'sticker',
    file: {
      hd: {
        gif: { url: `${MEDIA}/hd.gif`, width: 400, height: 300 },
        webp: { url: `${MEDIA}/hd.webp`, width: 400, height: 300 },
      },
      md: {
        gif: { url: `${MEDIA}/md.gif`, width: 200, height: 150 },
        webp: { url: `${MEDIA}/md.webp`, width: 200, height: 150 },
      },
      sm: {
        gif: { url: `${MEDIA}/sm.gif`, width: 100, height: 75 },
        webp: { url: `${MEDIA}/sm.webp`, width: 100, height: 75 },
      },
    },
    ...overrides,
  };
}

describe('mapKlipyStickersToStickers', () => {
  it('uses the md webp for the list, the hd webp as original and the hd gif to share', () => {
    const [sticker] = mapKlipyStickersToStickers([createKlipySticker()]);

    expect(sticker).toEqual({
      id: '6914457558367152',
      title: 'Hola',
      imageUrl: `${MEDIA}/md.webp`,
      width: 200,
      height: 150,
      originalImageUrl: `${MEDIA}/hd.webp`,
      shareUrl: `${MEDIA}/hd.gif`,
    });
  });

  it('falls back to the gif files when there is no webp', () => {
    const [sticker] = mapKlipyStickersToStickers([
      createKlipySticker({
        file: {
          hd: { gif: { url: `${MEDIA}/hd.gif` } },
          md: { gif: { url: `${MEDIA}/md.gif`, width: 200, height: 150 } },
        },
      }),
    ]);

    expect(sticker.imageUrl).toBe(`${MEDIA}/md.gif`);
    expect(sticker.originalImageUrl).toBe(`${MEDIA}/hd.gif`);
    expect(sticker.shareUrl).toBe(`${MEDIA}/hd.gif`);
  });

  it('falls back to the sm size and takes the width and height from that same file', () => {
    const [sticker] = mapKlipyStickersToStickers([
      createKlipySticker({
        file: { sm: { webp: { url: `${MEDIA}/sm.webp`, width: 100, height: 75 } } },
      }),
    ]);

    expect(sticker.imageUrl).toBe(`${MEDIA}/sm.webp`);
    expect(sticker.width).toBe(100);
    expect(sticker.height).toBe(75);
    // Sin hd ni md se comparte y se descarga la misma imagen
    expect(sticker.originalImageUrl).toBe(`${MEDIA}/sm.webp`);
    expect(sticker.shareUrl).toBe(`${MEDIA}/sm.webp`);
  });

  it('drops the ads and the stickers without a usable image', () => {
    const stickers = mapKlipyStickersToStickers([
      createKlipySticker({ id: 1, type: 'ad' }),
      createKlipySticker({ id: 2, file: undefined }),
      createKlipySticker({ id: 3, file: { md: { webm: { url: `${MEDIA}/md.webm` } } } }),
      createKlipySticker({ id: 4 }),
    ]);

    expect(stickers.map((sticker) => sticker.id)).toEqual(['4']);
  });

  it('leaves width and height undefined when KLIPY does not send them', () => {
    const [sticker] = mapKlipyStickersToStickers([
      createKlipySticker({ file: { md: { webp: { url: `${MEDIA}/md.webp` } } } }),
    ]);

    expect(sticker.width).toBeUndefined();
    expect(sticker.height).toBeUndefined();
  });
});
