import { MenuOption } from '../interfaces/menu-option.interface';

// Las comparten el menú lateral (escritorio) y la barra de abajo (móvil)
export const MENU_OPTIONS: readonly MenuOption[] = [
  {
    label: 'Tendencias',
    sublabel: 'Los stickers más populares',
    route: '/dashboard/trending',
    icon: 'chart-line',
  },
  {
    label: 'Buscar',
    sublabel: 'Buscar stickers',
    route: '/dashboard/search',
    icon: 'magnifying-glass',
  },
  {
    label: 'Favoritos',
    sublabel: 'Tus stickers guardados',
    route: '/dashboard/favorites',
    icon: 'heart',
    showFavoritesCount: true,
  },
];
