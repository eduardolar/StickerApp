import { I18nPluralPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { StickersList } from '../../components/stickers-list/stickers-list';
import { StickersService } from '../../services/stickers.service';
import { SAVED_STICKERS_PLURAL } from '../../utils/sticker-plurals';

@Component({
  imports: [I18nPluralPipe, RouterLink, StickersList],
  selector: 'app-history-page',
  templateUrl: './history-page.component.html',
})
export default class HistoryPageComponent {
  private readonly stickersService = inject(StickersService);

  protected readonly savedStickersPlural = SAVED_STICKERS_PLURAL;

  // Se escucha el parámetro como observable porque Angular reutiliza el componente al cambiar de búsqueda
  protected readonly query = toSignal(
    inject(ActivatedRoute).params.pipe(map((params) => params['query'] as string)),
    { requireSync: true },
  );

  protected readonly stickers = computed(() =>
    this.stickersService.getHistoryStickers(this.query()),
  );
}
