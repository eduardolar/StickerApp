import { Component, input, output } from '@angular/core';
import { Sticker } from '../../../interfaces/sticker.interface';
import { StickerActions } from '../../sticker-actions/sticker-actions';

@Component({
  imports: [StickerActions],
  selector: 'app-sticker-list-item',
  templateUrl: './sticker-list-item.html',
})
export class StickerListItem {
  readonly sticker = input.required<Sticker>();
  // Para las imágenes que se ven nada más cargar la página
  readonly eager = input(false);
  readonly opened = output<void>();
}
