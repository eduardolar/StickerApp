import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { NativeAppService } from './native-app.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    // Página nueva: empieza arriba. Botón "atrás": vuelve a donde estabas solo donde los datos siguen
    // en memoria (tendencias, favoritos); la búsqueda se vuelve a pedir y puede no volver a su sitio
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideAppInitializer(() => inject(NativeAppService).init()),
  ]
};
