import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/** Botón para cambiar entre modo claro y modo oscuro */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly themeService = inject(ThemeService);

  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
}
