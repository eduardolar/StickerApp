import { Sticker } from '../interfaces/sticker.interface';
import { distributeInColumns } from './distribute-in-columns';

function createSticker(id: string, width?: number, height?: number): Sticker {
  return {
    id,
    title: `Sticker ${id}`,
    imageUrl: `https://static.klipy.com/${id}.webp`,
    width,
    height,
    originalImageUrl: `https://static.klipy.com/${id}-original.webp`,
    shareUrl: `https://static.klipy.com/${id}-original.gif`,
  };
}

function idsOf(columns: Sticker[][]): string[][] {
  return columns.map((column) => column.map((sticker) => sticker.id));
}

describe('distributeInColumns', () => {
  it('creates as many columns as requested, even if some stay empty', () => {
    const columns = distributeInColumns([createSticker('a')], 3);

    expect(idsOf(columns)).toEqual([['a'], [], []]);
  });

  it('puts each sticker in the shortest column', () => {
    const stickers = [
      createSticker('tall', 100, 300),
      createSticker('short', 100, 50),
      createSticker('next', 100, 100),
    ];

    const columns = distributeInColumns(stickers, 2);

    // "next" va debajo de "short" porque esa columna mide 0.5 y la otra 3
    expect(idsOf(columns)).toEqual([['tall'], ['short', 'next']]);
  });

  it('treats stickers without dimensions as squares', () => {
    const stickers = [createSticker('a'), createSticker('b', 100, 200), createSticker('c')];

    const columns = distributeInColumns(stickers, 2);

    expect(idsOf(columns)).toEqual([['a', 'c'], ['b']]);
  });

  it('keeps the earlier stickers in their column when more are appended', () => {
    const firstPage = Array.from({ length: 12 }, (_, index) =>
      createSticker(`first-${index}`, 100, 50 + ((index * 37) % 150)),
    );
    const secondPage = Array.from({ length: 12 }, (_, index) =>
      createSticker(`second-${index}`, 100, 60 + ((index * 53) % 140)),
    );

    const before = idsOf(distributeInColumns(firstPage, 4));
    const after = idsOf(distributeInColumns([...firstPage, ...secondPage], 4));

    after.forEach((column, index) => {
      expect(column.slice(0, before[index].length)).toEqual(before[index]);
    });
  });

  it('uses a single column when the count is less than 1', () => {
    const columns = distributeInColumns([createSticker('a'), createSticker('b')], 0);

    expect(idsOf(columns)).toEqual([['a', 'b']]);
  });
});
