import { Component, input } from '@angular/core';
import { MenuIconName } from '../../interfaces/menu-option.interface';

/** Icono de una sección del menú. El tamaño lo pone quien lo usa (p. ej. class="h-5 w-5") */
@Component({
  selector: 'app-menu-icon',
  templateUrl: './menu-icon.html',
  host: { class: 'block', 'aria-hidden': 'true' },
})
export class MenuIcon {
  readonly icon = input.required<MenuIconName>();
}
