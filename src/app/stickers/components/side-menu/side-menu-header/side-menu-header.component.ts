import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../../../shared/components/theme-toggle/theme-toggle';

@Component({
  imports: [RouterLink, ThemeToggle],
  selector: 'app-side-menu-header',
  templateUrl: './side-menu-header.component.html',
})
export class SideMenuHeaderComponent {}
