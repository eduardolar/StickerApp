import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { MENU_OPTIONS } from '../../../utils/menu-options';
import { MenuIcon } from '../../menu-icon/menu-icon';

@Component({
  imports: [RouterLink, RouterLinkActive, MenuIcon],
  selector: 'app-side-menu-options',
  templateUrl: './side-menu-options.component.html',
})
export class SideMenuOptionsComponent {
  private readonly favoritesService = inject(FavoritesService);

  protected readonly favoritesCount = computed(() => this.favoritesService.favorites().length);

  protected readonly menuOptions = MENU_OPTIONS;
}
