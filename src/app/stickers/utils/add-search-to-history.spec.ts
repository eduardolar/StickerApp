import { SearchHistoryEntry } from '../interfaces/search-history-entry.interface';
import { Sticker } from '../interfaces/sticker.interface';
import { addSearchToHistory, confirmSearchInHistory } from './add-search-to-history';

function createSticker(id: string): Sticker {
  return {
    id,
    title: `Sticker ${id}`,
    imageUrl: `https://static.klipy.com/${id}.webp`,
    originalImageUrl: `https://static.klipy.com/${id}-original.webp`,
    shareUrl: `https://static.klipy.com/${id}-original.gif`,
  };
}

function createEntry(query: string, stickerCount = 1): SearchHistoryEntry {
  return {
    query,
    stickers: Array.from({ length: stickerCount }, (_, index) =>
      createSticker(`${query}-${index}`),
    ),
  };
}

/** Entrada que se guardó sola mientras se escribía */
function createTypedEntry(query: string): SearchHistoryEntry {
  return { ...createEntry(query), fromTyping: true };
}

function queriesOf(history: SearchHistoryEntry[]): string[] {
  return history.map((entry) => entry.query);
}

const typing = { fromTyping: true, maxEntries: 10 };
const explicit = { fromTyping: false, maxEntries: 10 };

describe('addSearchToHistory', () => {
  it('puts the new search first, lowercased', () => {
    const result = addSearchToHistory([createEntry('perros')], createEntry('Gatos'), explicit);

    expect(queriesOf(result)).toEqual(['gatos', 'perros']);
  });

  it('never saves a search without results', () => {
    const history = [createEntry('perros')];

    const result = addSearchToHistory(history, createEntry('xyzxyz', 0), typing);

    expect(result).toBe(history);
  });

  it('moves a repeated search to the top instead of duplicating it', () => {
    const history = [createEntry('perros'), createEntry('gatos')];

    const result = addSearchToHistory(history, createEntry('gatos'), explicit);

    expect(queriesOf(result)).toEqual(['gatos', 'perros']);
  });

  it('keeps at most maxEntries searches', () => {
    const history = [createEntry('b'), createEntry('c')];

    const result = addSearchToHistory(history, createEntry('a'), {
      fromTyping: false,
      maxEntries: 2,
    });

    expect(queriesOf(result)).toEqual(['a', 'b']);
  });

  it('replaces the latest search while typing a longer one', () => {
    const result = addSearchToHistory(
      [createTypedEntry('gat'), createEntry('perros')],
      createEntry('gatos'),
      typing,
    );

    expect(queriesOf(result)).toEqual(['gatos', 'perros']);
  });

  it('does not save anything while deleting letters', () => {
    const history = [createEntry('gatos')];

    const result = addSearchToHistory(history, createEntry('g'), typing);

    expect(result).toBe(history);
  });

  it('adds a longer explicit search without losing the previous one', () => {
    const result = addSearchToHistory([createEntry('hola')], createEntry('holanda'), explicit);

    expect(queriesOf(result)).toEqual(['holanda', 'hola']);
  });

  it('adds a shorter explicit search (e.g. back navigation) without replacing the latest', () => {
    const result = addSearchToHistory([createEntry('gatos')], createEntry('gat'), explicit);

    expect(queriesOf(result)).toEqual(['gat', 'gatos']);
  });

  it('adds an unrelated typed search normally', () => {
    const result = addSearchToHistory([createEntry('gatos')], createEntry('perros'), typing);

    expect(queriesOf(result)).toEqual(['perros', 'gatos']);
  });

  it('keeps an explicit search when the user keeps typing after it', () => {
    const result = addSearchToHistory([createEntry('holanda')], createEntry('holandas'), typing);

    expect(queriesOf(result)).toEqual(['holandas', 'holanda']);
  });

  it('treats old entries without fromTyping as explicit', () => {
    const history: SearchHistoryEntry[] = [{ query: 'gat', stickers: [createSticker('gat-0')] }];

    const result = addSearchToHistory(history, createEntry('gatos'), typing);

    expect(queriesOf(result)).toEqual(['gatos', 'gat']);
  });

  it('remembers whether each search came from typing', () => {
    const typed = addSearchToHistory([], createEntry('gat'), typing);
    const explicitResult = addSearchToHistory([], createEntry('gat'), explicit);

    expect(typed[0].fromTyping).toBe(true);
    expect(explicitResult[0].fromTyping).toBe(false);
  });

  it('does not turn an explicit search into a replaceable one when it is typed again', () => {
    const afterTyping = addSearchToHistory(
      [createTypedEntry('perros'), createEntry('gatos')],
      createEntry('gatos'),
      typing,
    );
    const result = addSearchToHistory(afterTyping, createEntry('gatosx'), typing);

    expect(afterTyping[0].fromTyping).toBe(false);
    expect(queriesOf(result)).toEqual(['gatosx', 'gatos', 'perros']);
  });

  it('does not modify the history it receives', () => {
    const history = [createTypedEntry('gat')];

    addSearchToHistory(history, createEntry('gatos'), typing);

    expect(queriesOf(history)).toEqual(['gat']);
  });
});

describe('confirmSearchInHistory', () => {
  it('marks an existing typed search as explicit without moving it', () => {
    const result = confirmSearchInHistory(
      [createEntry('perros'), createTypedEntry('gatos')],
      createEntry('gatos'),
      10,
    );

    expect(queriesOf(result)).toEqual(['perros', 'gatos']);
    expect(result[1].fromTyping).toBe(false);
  });

  it('saves a search reached by deleting letters when it is confirmed', () => {
    // "gatos" → borrar hasta "gat": la búsqueda en vivo no la guardó
    const afterTyping = addSearchToHistory([createTypedEntry('gatos')], createEntry('gat'), typing);

    const result = confirmSearchInHistory(afterTyping, createEntry('gat'), 10);

    expect(queriesOf(afterTyping)).toEqual(['gatos']);
    expect(queriesOf(result)).toEqual(['gat', 'gatos']);
    expect(result[0].fromTyping).toBe(false);
  });

  it('does not save a confirmed search without results', () => {
    const history = [createEntry('gatos')];

    const result = confirmSearchInHistory(history, createEntry('gat', 0), 10);

    expect(result).toBe(history);
  });

  it('keeps at most maxEntries searches when adding the confirmed one', () => {
    const result = confirmSearchInHistory([createEntry('b'), createEntry('c')], createEntry('a'), 2);

    expect(queriesOf(result)).toEqual(['a', 'b']);
  });
});
