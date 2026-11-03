import { Component } from '@angular/core';

/** Rectángulos grises animados que imitan la lista masonry mientras cargan los stickers */
@Component({
  selector: 'app-stickers-list-skeleton',
  templateUrl: './stickers-list-skeleton.html',
})
export class StickersListSkeleton {
  // Alturas variadas (px) para que se parezca al masonry real
  protected readonly heights = [180, 240, 150, 210, 260, 170, 230, 190, 150, 250, 200, 170];
}
