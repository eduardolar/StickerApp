import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { readFromLocalStorage, saveToLocalStorage } from '../utils/local-storage';

// Si cambias esta clave, cámbiala también en los scripts de index.html y public/politica-privacidad.html
const THEME_STORAGE_KEY = 'stickers-theme';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export type Theme = 'light' | 'dark';

/** Tema elegido con el botón, o `null` si el usuario nunca ha elegido */
function readStoredTheme(): Theme | null {
  const stored = readFromLocalStorage<unknown>(THEME_STORAGE_KEY, null);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function getInitialTheme(): Theme {
  // Si el usuario nunca ha elegido, se usa el modo de su sistema operativo
  return readStoredTheme() ?? (window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light');
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(getInitialTheme());
  readonly theme = this._theme.asReadonly();

  // Tailwind activa las clases `dark:` cuando <html> tiene la clase "dark"
  private readonly applyTheme = effect(() => {
    document.documentElement.classList.toggle('dark', this._theme() === 'dark');
  });

  constructor() {
    const darkScheme = window.matchMedia(DARK_SCHEME_QUERY);
    const followSystem = (event: MediaQueryListEvent) => {
      // Si el sistema cambia de modo (p. ej. al anochecer) solo se sigue mientras no se haya elegido a mano
      if (readStoredTheme() === null) {
        this._theme.set(event.matches ? 'dark' : 'light');
      }
    };

    darkScheme.addEventListener('change', followSystem);
    inject(DestroyRef).onDestroy(() => darkScheme.removeEventListener('change', followSystem));
  }

  toggle(): void {
    this._theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
    // Se guarda solo aquí: si se guardase al arrancar, ya nunca se seguiría el modo del sistema
    saveToLocalStorage(THEME_STORAGE_KEY, this._theme());
  }
}
