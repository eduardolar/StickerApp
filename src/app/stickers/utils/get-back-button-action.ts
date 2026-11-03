/** Pantalla principal: el botón "atrás" de Android manda la app a segundo plano desde aquí */
export const HOME_PATH = '/dashboard/trending';

export type BackButtonAction = 'close-dialog' | 'minimize' | 'back' | 'go-home';

export interface BackButtonState {
  isDialogOpen: boolean;
  /** URL actual del router (puede llevar ?q=... o #...) */
  path: string;
  /** El WebView tiene páginas anteriores en su historial */
  canGoBack: boolean;
}

/**
 * Qué hacer al pulsar el botón "atrás" de Android. Fuera de la pantalla principal nunca se sale
 * de la app: si no hay historial (p. ej. se abrió directamente en Favoritos) se vuelve a la principal.
 */
export function getBackButtonAction({ isDialogOpen, path, canGoBack }: BackButtonState): BackButtonAction {
  if (isDialogOpen) {
    return 'close-dialog';
  }

  if (path.split(/[?#]/)[0] === HOME_PATH) {
    return 'minimize';
  }

  return canGoBack ? 'back' : 'go-home';
}
