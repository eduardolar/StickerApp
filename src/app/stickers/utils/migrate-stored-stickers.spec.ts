import { Sticker } from '../interfaces/sticker.interface';
import { migrateStoredStickers } from './migrate-stored-stickers';

function createSticker(id: string): Sticker {
  return {
    id,
    title: `Sticker ${id}`,
    imageUrl: `https://static.klipy.com/${id}.webp`,
    originalImageUrl: `https://static.klipy.com/${id}-original.webp`,
    shareUrl: `https://static.klipy.com/${id}-original.gif`,
  };
}

/** Sticker guardado por la versión que usaba GIPHY */
function createGiphySticker(id: string) {
  return {
    id,
    title: `Sticker ${id}`,
    imageUrl: `https://media.giphy.com/${id}/200w.webp`,
    width: 200,
    height: 150,
    originalImageUrl: `https://media.giphy.com/${id}/giphy.webp`,
    giphyUrl: `https://giphy.com/stickers/${id}`,
  };
}

describe('migrateStoredStickers', () => {
  it('renames giphyUrl to shareUrl and keeps the rest of the old GIPHY sticker', () => {
    const [sticker] = migrateStoredStickers([createGiphySticker('abc')]);

    expect(sticker).toEqual({
      id: 'abc',
      title: 'Sticker abc',
      imageUrl: 'https://media.giphy.com/abc/200w.webp',
      width: 200,
      height: 150,
      originalImageUrl: 'https://media.giphy.com/abc/giphy.webp',
      shareUrl: 'https://giphy.com/stickers/abc',
    });
  });

  it('leaves the stickers that already have shareUrl as they are', () => {
    const sticker = createSticker('a');

    expect(migrateStoredStickers([sticker])).toEqual([sticker]);
  });

  it('uses the original image as shareUrl when there is no link at all', () => {
    const [sticker] = migrateStoredStickers([{ ...createGiphySticker('abc'), giphyUrl: undefined }]);

    expect(sticker.shareUrl).toBe('https://media.giphy.com/abc/giphy.webp');
  });

  it('returns an empty list when the stored value is not a list', () => {
    expect(migrateStoredStickers(null)).toEqual([]);
    expect(migrateStoredStickers({ gatos: [] })).toEqual([]);
  });

  it('skips the items that are not objects', () => {
    const stickers = migrateStoredStickers([null, 'texto', createSticker('ok')]);

    expect(stickers.map((sticker) => sticker.id)).toEqual(['ok']);
  });
});
