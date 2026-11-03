import { Component, input, output } from '@angular/core';
import { InfiniteScrollDirective } from '../../directives/infinite-scroll.directive';

/** Lo que va debajo de una lista con scroll infinito: cargando, error con reintentar, centinela o fin */
@Component({
  imports: [InfiniteScrollDirective],
  selector: 'app-stickers-feed-status',
  templateUrl: './stickers-feed-status.html',
  host: { class: 'block' },
})
export class StickersFeedStatus {
  readonly isLoading = input.required<boolean>();
  readonly errorMessage = input.required<string>();
  readonly hasMore = input.required<boolean>();
  readonly endMessage = input.required<string>();

  readonly loadMore = output<void>();
}
