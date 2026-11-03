import { afterNextRender, computed, DestroyRef, inject, Injectable, Injector } from '@angular/core';
import { Location } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { filter, merge, pairwise, take } from 'rxjs';
import { AdsService } from './shared/services/ads.service';
import { NativeDeviceService } from './shared/services/native-device.service';
import { StickerDialogService } from './stickers/services/sticker-dialog.service';
import { getBackButtonAction, HOME_PATH } from './stickers/utils/get-back-button-action';

/** Comportamiento propio de la app Android: botón "atrás", pantalla de carga y anuncios. En la web no hace nada. */
@Injectable({ providedIn: 'root' })
export class NativeAppService {
  private readonly device = inject(NativeDeviceService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(StickerDialogService);
  private readonly ads = inject(AdsService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  init(): void {
    if (!this.device.isNative) {
      return;
    }

    this.listenToBackButton();
    this.onFirstPageShown(() => {
      void SplashScreen.hide();
      const isDialogOpen = computed(() => this.dialog.selected() !== null);

      // Después de la pantalla de carga, para que el aviso de consentimiento no salga encima de ella.
      // init() no espera a nada: los anuncios nunca retrasan la app
      this.ads.init({
        hideBannerWhen: isDialogOpen,
        bannerAboveSelector: '.bottom-nav',
        naturalBreaks: merge(
          this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
          // Al cerrar el sticker (estaba abierto y ya no)
          toObservable(isDialogOpen, { injector: this.injector }).pipe(
            pairwise(),
            filter(([wasOpen, isOpen]) => wasOpen && !isOpen),
          ),
        ),
      });
    });
  }

  private listenToBackButton(): void {
    // Al escuchar el botón, Capacitor deja de hacer su "atrás" por defecto: lo decide getBackButtonAction
    App.addListener('backButton', ({ canGoBack }) => {
      const action = getBackButtonAction({
        isDialogOpen: this.dialog.selected() !== null,
        path: this.router.url,
        canGoBack,
      });

      switch (action) {
        case 'close-dialog':
          this.dialog.close();
          break;
        case 'minimize':
          // Como el botón "inicio": la app sigue en memoria y vuelve tal cual (cerrarla haría arrancar de cero)
          void App.minimizeApp();
          break;
        case 'back':
          this.location.back();
          break;
        case 'go-home':
          void this.router.navigateByUrl(HOME_PATH, { replaceUrl: true });
          break;
      }
    })
      .then((handle) => this.destroyRef.onDestroy(() => void handle.remove()))
      .catch((error: unknown) => console.error('Failed to listen to the back button.', error));
  }

  /**
   * La pantalla de carga se quita cuando ya se ve la primera página (y no un fondo vacío).
   * Si algo falla, el propio plugin la quita a los 3 s (launchAutoHide en capacitor.config.ts).
   */
  private onFirstPageShown(callback: () => void): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      )
      .subscribe(() => {
        afterNextRender(callback, { injector: this.injector });
      });
  }
}
