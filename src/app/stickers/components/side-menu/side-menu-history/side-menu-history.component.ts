import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { StickersService } from '../../../services/stickers.service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-side-menu-history',
  templateUrl: './side-menu-history.component.html',
})
export class SideMenuHistoryComponent {
  private readonly router = inject(Router);
  protected readonly stickersService = inject(StickersService);

  protected remove(key: string): void {
    this.stickersService.removeFromHistory(key);

    // Si estabas viendo justo esa búsqueda, se vuelve al buscador para no quedarse en una página vacía
    const historyUrl = this.router.createUrlTree(['/dashboard/history', key]).toString();
    if (this.router.url === historyUrl) {
      this.router.navigate(['/dashboard/search']);
    }
  }

  protected clearAll(): void {
    if (!confirm('¿Seguro que quieres borrar todo el historial?')) {
      return;
    }

    this.stickersService.clearHistory();

    if (this.router.url.startsWith('/dashboard/history')) {
      this.router.navigate(['/dashboard/search']);
    }
  }
}
