import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StickersService } from '../../services/stickers.service';

/** Búsquedas recientes como etiquetas: en el móvil hace de historial del menú lateral */
@Component({
  imports: [RouterLink],
  selector: 'app-recent-searches',
  templateUrl: './recent-searches.html',
})
export class RecentSearches {
  protected readonly stickersService = inject(StickersService);

  protected clearAll(): void {
    if (confirm('¿Seguro que quieres borrar todo el historial?')) {
      this.stickersService.clearHistory();
    }
  }
}
