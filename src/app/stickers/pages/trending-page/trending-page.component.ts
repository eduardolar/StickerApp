import { Component, OnInit, inject } from '@angular/core';
import { PoweredBy } from '../../../shared/components/powered-by/powered-by';
import { StickersFeedStatus } from '../../components/stickers-feed-status/stickers-feed-status';
import { StickersList } from '../../components/stickers-list/stickers-list';
import { StickersListSkeleton } from '../../components/stickers-list-skeleton/stickers-list-skeleton';
import { TrendingStickersService } from '../../services/trending-stickers.service';

@Component({
  imports: [StickersList, StickersListSkeleton, StickersFeedStatus, PoweredBy],
  selector: 'app-trending-page',
  templateUrl: './trending-page.component.html',
})
export default class TrendingPageComponent implements OnInit {
  // Los datos viven en el servicio: al volver a esta página siguen ahí y no se recargan
  protected readonly trending = inject(TrendingStickersService);

  ngOnInit(): void {
    if (this.trending.stickers().length === 0) {
      this.trending.loadNextPage();
    }
  }
}
