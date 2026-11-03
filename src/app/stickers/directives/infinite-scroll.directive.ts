import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * Emite `scrolledToEnd` cuando el elemento entra en pantalla.
 * Se coloca un elemento "centinela" al final de una lista para cargar más al llegar abajo.
 *
 * El centinela mide `distance` px de alto y se sube esa misma distancia con un margen negativo:
 * así no ocupa espacio, pero empieza a verse `distance` px antes del final y la carga se adelanta.
 */
@Directive({
  selector: '[appInfiniteScroll]',
  host: {
    class: 'block pointer-events-none',
    '[style.height.px]': 'distance()',
    '[style.margin-top.px]': '-distance()',
  },
})
export class InfiniteScrollDirective {
  readonly distance = input(600);
  readonly scrolledToEnd = output<void>();

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        this.scrolledToEnd.emit();
      }
    });

    observer.observe(element);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
