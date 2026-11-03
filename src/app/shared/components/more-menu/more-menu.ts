import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { APP_VERSION, KLIPY_URL, PRIVACY_POLICY_PATH } from '../../config/app-info';
import { AdsService } from '../../services/ads.service';

let nextId = 0;

/**
 * Botón "Más opciones" (⋮): política de privacidad, privacidad de anuncios, atribución de KLIPY y versión.
 * Es un desplegable (disclosure) y no un role="menu": son enlaces normales que se recorren con Tab.
 */
@Component({
  selector: 'app-more-menu',
  templateUrl: './more-menu.html',
  host: {
    class: 'relative block',
    '(document:click)': 'closeOnOutsideClick($event)',
    '(keydown.escape)': 'closeAndFocusTrigger()',
    '(focusout)': 'closeOnFocusLeave($event)',
    '(window:pageshow)': 'closeOnPageRestored($event)',
  },
})
export class MoreMenu {
  /** `icon`: botón redondo que abre hacia abajo (barra de arriba). `full`: fila con texto que abre hacia arriba (menú lateral) */
  readonly variant = input<'icon' | 'full'>('icon');

  protected readonly ads = inject(AdsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly appVersion = APP_VERSION;
  protected readonly klipyUrl = KLIPY_URL;
  protected readonly privacyPolicyPath = PRIVACY_POLICY_PATH;
  // Hay dos a la vez en la página (barra de arriba y menú lateral): cada uno necesita su id
  protected readonly panelId = `more-menu-panel-${nextId++}`;

  protected readonly isOpen = signal(false);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  protected toggle(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      return;
    }

    this.isOpen.set(true);
    // El foco pasa a la primera opción cuando el panel ya se ve
    afterNextRender(
      () => this.panel().nativeElement.querySelector<HTMLElement>('a, button')?.focus(),
      { injector: this.injector },
    );
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected closeAndFocusTrigger(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.trigger().nativeElement.focus();
    }
  }

  protected closeOnOutsideClick(event: MouseEvent): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node | null)) {
      this.isOpen.set(false);
    }
  }

  /**
   * Solo si el foco pasa a otro elemento de fuera. Con relatedTarget null (Safari al pulsar un botón,
   * que no recibe el foco) no se cierra: si no, el clic en ⋮ lo volvería a abrir. Los clics fuera ya
   * los cierra closeOnOutsideClick.
   */
  protected closeOnFocusLeave(event: FocusEvent): void {
    const next = event.relatedTarget;

    if (this.isOpen() && next instanceof Node && !this.host.nativeElement.contains(next)) {
      this.isOpen.set(false);
    }
  }

  /** Al volver atrás desde la política el navegador puede restaurar la página tal cual (bfcache) */
  protected closeOnPageRestored(event: PageTransitionEvent): void {
    if (event.persisted) {
      this.isOpen.set(false);
    }
  }

  protected openAdPrivacyOptions(): void {
    this.closeAndFocusTrigger();
    void this.ads.showPrivacyOptions();
  }
}
