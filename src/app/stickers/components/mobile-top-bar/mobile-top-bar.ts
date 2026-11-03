import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoreMenu } from '../../../shared/components/more-menu/more-menu';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';

/** Barra de arriba del móvil: en pantallas grandes la sustituye el menú lateral */
@Component({
  imports: [RouterLink, ThemeToggle, MoreMenu],
  selector: 'app-mobile-top-bar',
  templateUrl: './mobile-top-bar.html',
})
export class MobileTopBar {}
