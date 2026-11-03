import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./stickers/pages/dashboard-page/dashboard-page.component'),
    children: [
      {
        path: 'trending',
        title: 'Tendencias · StickerApp',
        loadComponent: () => import('./stickers/pages/trending-page/trending-page.component'),
      },
      {
        path: 'search',
        title: 'Buscar · StickerApp',
        loadComponent: () => import('./stickers/pages/search-page/search-page.component'),
      },
      {
        path: 'favorites',
        title: 'Favoritos · StickerApp',
        loadComponent: () => import('./stickers/pages/favorites-page/favorites-page.component'),
      },
      {
        path: 'history/:query',
        title: (route) => `Historial: ${route.paramMap.get('query')} · StickerApp`,
        loadComponent: () => import('./stickers/pages/history-page/history-page.component'),
      },
      {
        path: '**',
        redirectTo: 'trending',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
