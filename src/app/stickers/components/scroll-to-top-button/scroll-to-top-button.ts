import { Component, effect, input, signal } from '@angular/core';

/**
 * Botón flotante que aparece cuando `target` (un elemento al principio de la página)
 * deja de verse en pantalla, y que al pulsarlo sube hasta él.
 */
@Component({
  selector: 'app-scroll-to-top-button',
  templateUrl: './scroll-to-top-button.html',
})
export class ScrollToTopButton {
  readonly target = input.required<HTMLElement>();

  protected readonly isVisible = signal(false);

  constructor() {
    effect((onCleanup) => {
      const observer = new IntersectionObserver(([entry]) => {
        this.isVisible.set(!entry.isIntersecting);
      });

      observer.observe(this.target());
      onCleanup(() => observer.disconnect());
    });
  }

  protected scrollToTop(): void {
    // scrollIntoView sube el contenedor que tenga el scroll, sea la ventana o un div
    this.target().scrollIntoView({ behavior: 'smooth' });
  }
}
