/** Una sección de la app en el menú lateral y en la barra de abajo del móvil */
export interface MenuOption {
  label: string;
  sublabel: string;
  route: string;
  icon: MenuIconName;
  showFavoritesCount?: true;
}

export type MenuIconName = 'chart-line' | 'magnifying-glass' | 'heart';
