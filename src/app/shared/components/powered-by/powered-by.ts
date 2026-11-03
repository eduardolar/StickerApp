import { Component } from '@angular/core';
import { KLIPY_URL } from '../../config/app-info';

/** Atribución "Powered by KLIPY" junto a los stickers (KLIPY la recomienda, aunque es opcional) */
@Component({
  selector: 'app-powered-by',
  templateUrl: './powered-by.html',
})
export class PoweredBy {
  protected readonly klipyUrl = KLIPY_URL;
}
