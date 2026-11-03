import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { StickerListItem } from './sticker-list-item/sticker-list-item';
import { Sticker } from '../../interfaces/sticker.interface';
import { StickerDialogService } from '../../services/sticker-dialog.service';
import { distributeInColumns } from '../../utils/distribute-in-columns';

// Mismas columnas que tenía con Tailwind (columns-2 sm:columns-3 lg:columns-4 2xl:columns-5); de mayor a menor
const COLUMN_BREAKPOINTS = [
  { query: '(min-width: 1536px)', columns: 5 },
  { query: '(min-width: 1024px)', columns: 4 },
  { query: '(min-width: 640px)', columns: 3 },
];
const DEFAULT_COLUMN_COUNT = 2;

@Component({
  imports: [StickerListItem],
  selector: 'app-stickers-list',
  templateUrl: './stickers-list.html',
})
export class StickersList {
  protected readonly dialogService = inject(StickerDialogService);

  readonly stickers = input.required<Sticker[]>();

  private readonly breakpoints = COLUMN_BREAKPOINTS.map(({ query, columns }) => ({
    mediaQuery: window.matchMedia(query),
    columns,
  }));

  protected readonly columnCount = signal(this.readColumnCount());
  protected readonly columns = computed(() =>
    distributeInColumns(this.stickers(), this.columnCount()),
  );

  constructor() {
    const updateColumnCount = () => this.columnCount.set(this.readColumnCount());

    for (const { mediaQuery } of this.breakpoints) {
      mediaQuery.addEventListener('change', updateColumnCount);
    }

    inject(DestroyRef).onDestroy(() => {
      for (const { mediaQuery } of this.breakpoints) {
        mediaQuery.removeEventListener('change', updateColumnCount);
      }
    });
  }

  private readColumnCount(): number {
    return (
      this.breakpoints.find(({ mediaQuery }) => mediaQuery.matches)?.columns ?? DEFAULT_COLUMN_COUNT
    );
  }
}
