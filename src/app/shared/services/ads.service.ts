import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  Injector,
  Signal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentInfo,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import { Observable } from 'rxjs';
import { ADS_CONFIG } from '../config/ads.config';
import { decidePendingInterstitial } from '../utils/decide-pending-interstitial';
import { NativeDeviceService } from './native-device.service';
import { NetworkStatusService } from './network-status.service';

export interface AdsInitOptions {
  /** Mientras sea `true` el banner se esconde (p. ej. con el diálogo del sticker abierto) */
  hideBannerWhen: Signal<boolean>;
  /** Selector de la barra fija de abajo: el banner se coloca justo encima de ella */
  bannerAboveSelector: string;
  /** Cambios naturales dentro de la app (cerrar el sticker, cambiar de pantalla): solo ahí sale el intersticial */
  naturalBreaks: Observable<unknown>;
}

// md de Tailwind: desde ahí no hay barra de pestañas abajo (sale el menú lateral) y no se enseña banner
const WIDE_SCREEN_QUERY = '(min-width: 48rem)';
// Alto de la barra de pestañas sin la zona de gestos (min-h-14 + py-1 + borde), por si no se puede medir
const FALLBACK_NAV_HEIGHT = 65;
// Hueco entre el banner y las pestañas: pegados, es fácil pulsar el anuncio sin querer
const BANNER_GAP = 8;
// Calma tras compartir/guardar o tras volver a la app antes de un intersticial (deja leer el aviso "Guardado...")
const INTERSTITIAL_QUIET_MS = 2000;
const BANNER_HEIGHT_CSS_VAR = '--ad-banner-height';

type BannerState = 'none' | 'visible' | 'hidden';

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Anuncios de AdMob (banner abajo e intersticial). Es el único sitio que habla con el plugin.
 * En la web no hace nada. Cualquier fallo se ignora: un anuncio nunca debe romper la app.
 */
@Injectable({ providedIn: 'root' })
export class AdsService {
  private readonly device = inject(NativeDeviceService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly appStartedAt = Date.now();
  private started = false;
  private sdkInitialized = false;
  private isStarting = false;
  // El consentimiento o el SDK fallaron (normalmente por falta de internet): se reintenta al volver la conexión
  private startFailed = false;

  private readonly canRequestAds = signal(false);
  private readonly isKeyboardOpen = signal(false);
  private readonly isWideScreen = signal(false);

  private readonly _privacyOptionsRequired = signal(false);
  /** Google exige un acceso para cambiar el consentimiento cuando esto es `true` */
  readonly privacyOptionsRequired = this._privacyOptionsRequired.asReadonly();

  private readonly _bannerHeight = signal(0);
  /** Alto del banner en px de CSS (0 si no se ve) */
  readonly bannerHeight = this._bannerHeight.asReadonly();

  private bannerState: BannerState = 'none';
  // Las llamadas al banner van en fila: esconderlo y enseñarlo muy seguido no debe cruzarse
  private bannerQueue = Promise.resolve();

  private isInterstitialReady = false;
  private isInterstitialLoading = false;
  private isInterstitialShowing = false;
  private lastInterstitialAt: number | null = null;
  private interstitialOpportunityAt: number | null = null;
  private resumedAt: number | null = null;

  /** No espera al consentimiento: la app se pinta ya y los anuncios llegan cuando se pueda */
  init(options: AdsInitOptions): void {
    if (!this.device.isNative || this.started) {
      return;
    }
    this.started = true;

    effect(
      () => {
        const height = this._bannerHeight();
        // El hueco sobre las pestañas también se reserva en la página
        const reserved = height > 0 ? height + BANNER_GAP : 0;
        document.documentElement.style.setProperty(BANNER_HEIGHT_CSS_VAR, `${reserved}px`);
      },
      { injector: this.injector },
    );
    this.watchKeyboard();
    this.watchScreenWidth();
    this.watchAppResume();
    this.retryWhenBackOnline();
    this.syncBannerVisibility(options);

    options.naturalBreaks
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.showPendingInterstitial());

    void this.requestConsentAndStart();
  }

  async showPrivacyOptions(): Promise<void> {
    try {
      await AdMob.showPrivacyOptionsForm();
      // El usuario puede haber retirado o dado el consentimiento
      await this.applyConsent(await AdMob.requestConsentInfo());
    } catch (error: unknown) {
      console.warn('Failed to show ad privacy options.', error);
    }
  }

  /**
   * Se acaba de compartir o guardar un sticker (una pausa natural). El intersticial no sale ahora
   * (se acaba de volver de WhatsApp o está el aviso de "Guardado..."), sino en el siguiente
   * cambio natural dentro de la app. Llamar solo cuando la acción ha terminado bien.
   */
  markInterstitialOpportunity(): void {
    if (!this.started) {
      return;
    }

    this.interstitialOpportunityAt = Date.now();

    if (!this.isInterstitialReady) {
      // Si no se pudo cargar antes, se intenta para cuando llegue el momento
      void this.prepareInterstitial();
    }
  }

  private async showPendingInterstitial(): Promise<void> {
    if (this.isInterstitialShowing) {
      return;
    }

    const decision = decidePendingInterstitial({
      now: Date.now(),
      appStartedAt: this.appStartedAt,
      lastShownAt: this.lastInterstitialAt,
      minIntervalMs: ADS_CONFIG.interstitialMinIntervalMs,
      firstDelayMs: ADS_CONFIG.interstitialFirstDelayMs,
      opportunityAt: this.interstitialOpportunityAt,
      resumedAt: this.resumedAt,
      quietMs: INTERSTITIAL_QUIET_MS,
      maxAgeMs: ADS_CONFIG.interstitialOpportunityMaxAgeMs,
    });

    if (decision === 'none' || decision === 'wait') {
      return;
    }

    // Se use o no, la oportunidad se gasta aquí
    this.interstitialOpportunityAt = null;

    if (decision === 'discard' || !this.canRequestAds() || !this.isInterstitialReady) {
      return;
    }

    const previousShownAt = this.lastInterstitialAt;
    this.isInterstitialReady = false;
    this.isInterstitialShowing = true;
    this.lastInterstitialAt = Date.now();

    try {
      await AdMob.showInterstitial();
    } catch (error: unknown) {
      console.warn('Failed to show interstitial ad.', error);
      this.lastInterstitialAt = previousShownAt;
      this.isInterstitialShowing = false;
      void this.prepareInterstitial();
    }
  }

  private async requestConsentAndStart(): Promise<void> {
    if (this.isStarting) {
      return;
    }
    this.isStarting = true;

    try {
      // RGPD: primero el consentimiento (formulario de Google/UMP) y después el SDK de anuncios
      let consentInfo = await AdMob.requestConsentInfo();

      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        consentInfo = await AdMob.showConsentForm();
      }

      await this.applyConsent(consentInfo);
      this.startFailed = false;
    } catch (error: unknown) {
      console.warn('Ads disabled until the connection comes back.', error);
      this.startFailed = true;
    } finally {
      this.isStarting = false;
    }
  }

  private async applyConsent(consentInfo: AdmobConsentInfo): Promise<void> {
    // El plugin no exporta el enum PrivacyOptionsRequirementStatus: se compara con su valor
    this._privacyOptionsRequired.set(
      (consentInfo.privacyOptionsRequirementStatus as string) === 'REQUIRED',
    );

    if (!consentInfo.canRequestAds) {
      this.canRequestAds.set(false);
      return;
    }

    if (!this.sdkInitialized) {
      await AdMob.initialize({ maxAdContentRating: ADS_CONFIG.maxAdContentRating });
      await this.listenToAdEvents();
      this.sdkInitialized = true;
    }

    this.canRequestAds.set(true);
    void this.prepareInterstitial();
  }

  private async listenToAdEvents(): Promise<void> {
    // Se escuchan antes de enseñar nada para no perder el primer cambio de tamaño del banner
    const handles: PluginListenerHandle[] = await Promise.all([
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) =>
        this._bannerHeight.set(height),
      ),
      AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
        // El plugin destruye el banner al fallar: la próxima vez que toque enseñarlo se pide otro
        this.bannerState = 'none';
        this._bannerHeight.set(0);
      }),
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.isInterstitialShowing = false;
        void this.prepareInterstitial();
      }),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        this.isInterstitialShowing = false;
        void this.prepareInterstitial();
      }),
    ]);

    this.destroyRef.onDestroy(() => handles.forEach((handle) => void handle.remove()));
  }

  private syncBannerVisibility({ hideBannerWhen, bannerAboveSelector }: AdsInitOptions): void {
    const shouldShowBanner = computed(
      () =>
        this.canRequestAds() &&
        this.networkStatus.isOnline() &&
        !hideBannerWhen() &&
        !this.isKeyboardOpen() &&
        !this.isWideScreen(),
    );

    effect(
      () => {
        const show = shouldShowBanner();
        this.enqueueBannerCall(() =>
          show ? this.showBanner(bannerAboveSelector) : this.hideBanner(),
        );
      },
      { injector: this.injector },
    );

    this.removeBannerOnPageExit(() => {
      if (shouldShowBanner()) {
        this.enqueueBannerCall(() => this.showBanner(bannerAboveSelector));
      }
    });
  }

  private enqueueBannerCall(call: () => Promise<void>): void {
    this.bannerQueue = this.bannerQueue.then(call).catch((error: unknown) => {
      console.warn('Banner ad call failed.', error);
    });
  }

  private async showBanner(bannerAboveSelector: string): Promise<void> {
    if (this.bannerState === 'visible') {
      return;
    }

    if (this.bannerState === 'hidden') {
      await AdMob.resumeBanner();
      this.bannerState = 'visible';
      return;
    }

    await AdMob.showBanner({
      adId: ADS_CONFIG.bannerAdUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: this.getBannerMargin(bannerAboveSelector),
    });
    this.bannerState = 'visible';
  }

  private async hideBanner(): Promise<void> {
    if (this.bannerState !== 'visible') {
      return;
    }

    await AdMob.hideBanner();
    this.bannerState = 'hidden';
  }

  /**
   * Margen inferior del banner (en dp): encima de la barra de pestañas y con BANNER_GAP de separación.
   * - En el WebView de Capacitor 1px de CSS = 1dp (Capacitor pasa las zonas seguras dividiendo
   *   entre la densidad), así que el alto medido en el DOM vale tal cual.
   * - No se suma la zona de gestos (--safe-bottom): el plugin ya añade ese hueco del sistema por su cuenta.
   * - Se mide en vez de fijarlo para que siga valiendo si la barra cambia de alto (p. ej. letra grande).
   */
  private getBannerMargin(bannerAboveSelector: string): number {
    const element = document.querySelector<HTMLElement>(bannerAboveSelector);
    const height = element
      ? element.getBoundingClientRect().height -
        parseFloat(getComputedStyle(element).paddingBottom || '0')
      : 0;

    // Hacia arriba: mejor 1dp de aire que tapar el borde de la barra
    return (height > 0 ? Math.ceil(height) : FALLBACK_NAV_HEIGHT) + BANNER_GAP;
  }

  private async prepareInterstitial(): Promise<void> {
    if (!this.canRequestAds() || this.isInterstitialReady || this.isInterstitialLoading) {
      return;
    }

    this.isInterstitialLoading = true;

    try {
      await AdMob.prepareInterstitial({ adId: ADS_CONFIG.interstitialAdUnitId });
      this.isInterstitialReady = true;
    } catch (error: unknown) {
      console.warn('Failed to load interstitial ad.', error);
    } finally {
      this.isInterstitialLoading = false;
    }
  }

  /** Si el consentimiento falló sin internet, se reintenta una vez cada vez que vuelve la conexión */
  private retryWhenBackOnline(): void {
    let wasOnline = this.networkStatus.isOnline();

    effect(
      () => {
        const isOnline = this.networkStatus.isOnline();

        if (isOnline && !wasOnline && this.startFailed && !this.sdkInitialized) {
          void this.requestConsentAndStart();
        }
        wasOnline = isOnline;
      },
      { injector: this.injector },
    );
  }

  /** Al volver de otra app (WhatsApp, el menú de compartir...) no se enseña un intersticial enseguida */
  private watchAppResume(): void {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.resumedAt = Date.now();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisibilityChange),
    );
  }

  /**
   * El banner es una vista nativa encima del WebView: si se sale de la app web (p. ej. a la política
   * de privacidad, que es otra página) seguiría ahí tapando el contenido.
   */
  private removeBannerOnPageExit(onPageRestored: () => void): void {
    const onPageHide = () => {
      if (this.bannerState !== 'none') {
        this.bannerState = 'none';
        // Directo y no en la fila: la página se está cerrando y no daría tiempo a esperar a las anteriores
        void AdMob.removeBanner();
      }
    };
    // Si al volver atrás el navegador reutiliza la página tal cual (sin recargarla), se vuelve a poner
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        onPageRestored();
      }
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    });
  }

  /** Mismo criterio que styles.css para esconder la barra de abajo: hay un campo de texto con el foco */
  private watchKeyboard(): void {
    const onFocusIn = (event: FocusEvent) => this.isKeyboardOpen.set(isTextField(event.target));
    // Al salir de un campo se mira adónde va el foco: puede pasar directamente a otro campo
    const onFocusOut = (event: FocusEvent) =>
      this.isKeyboardOpen.set(isTextField(event.relatedTarget));

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    });
  }

  private watchScreenWidth(): void {
    const wideScreen = window.matchMedia(WIDE_SCREEN_QUERY);
    const update = () => this.isWideScreen.set(wideScreen.matches);

    update();
    wideScreen.addEventListener('change', update);
    this.destroyRef.onDestroy(() => wideScreen.removeEventListener('change', update));
  }
}
