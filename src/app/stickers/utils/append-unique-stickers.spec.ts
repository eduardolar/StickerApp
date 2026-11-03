import { Sticker } from '../interfaces/sticker.interface';
import { appendUniqueStickers } from './append-unique-stickers';

function createSticker(id: string): Sticker {
  return {
    id,
    title: `Sticker ${id}`,
    imageUrl: `https://static.klipy.com/${id}.webp`,
    originalImageUrl: `https://static.klipy.com/${id}-original.webp`,
    shareUrl: `https://static.klipy.com/${id}-original.gif`,
  };
}

describe('appendUniqueStickers', () => {
  it('drops the stickers whose id is already in the list', () => {
    const current = [createSticker('a'), createSticker('b')];
    const incoming = [createSticker('b'), createSticker('c')];

    const result = appendUniqueStickers(current, incoming);

    expect(result.map((sticker) => sticker.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the current stickers first and the new ones in their original order', () => {
    const current = [createSticker('b'), createSticker('a')];
    const incoming = [createSticker('d'), createSticker('a'), createSticker('c')];

    const result = appendUniqueStickers(current, incoming);

    expect(result.map((sticker) => sticker.id)).toEqual(['b', 'a', 'd', 'c']);
  });

  it('does not modify the arrays it receives', () => {
    const current = [createSticker('a')];
    const incoming = [createSticker('b')];

    appendUniqueStickers(current, incoming);

    expect(current.map((sticker) => sticker.id)).toEqual(['a']);
    expect(incoming.map((sticker) => sticker.id)).toEqual(['b']);
  });
});
