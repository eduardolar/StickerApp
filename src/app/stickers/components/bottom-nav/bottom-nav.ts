import { Component, computed, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { FavoritesService } from '../../services/favorites.service';
import { MENU_OPTIONS } from '../../utils/menu-options';
import { MenuIcon } from '../menu-icon/menu-icon';

/** Pestañas fijas abajo en el móvil: en pantallas grandes se usa el menú lateral */
@Component({
  imports: [RouterLink, RouterLinkActive, MenuIcon],
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
})
export class BottomNav {
  private readonly favoritesService = inject(FavoritesService);

  protected readonly favoritesCount = computed(() => this.favoritesService.favorites().length);

  protected readonly menuOptions = MENU_OPTIONS;

  // La ruta tiene que coincidir entera, pero sin mirar el ?q= (así "Buscar" sigue marcada al buscar)
  protected readonly activeOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
}
