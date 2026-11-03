import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Sticker } from '../../interfaces/sticker.interface';
import { StickerActions } from '../sticker-actions/sticker-actions';

/**
 * Ventana para ver un sticker en grande. Usa la etiqueta <dialog> del navegador, que ya trae
 * el fondo oscuro, el cierre con la tecla Escape y mantiene el foco del teclado dentro.
 */
@Component({
  imports: [StickerActions],
  selector: 'app-sticker-dialog',
  templateUrl: './sticker-dialog.html',
})
export class StickerDialog {
  readonly sticker = input.required<Sticker>();
  readonly hasPrevious = input(false);
  readonly hasNext = input(false);
  /** "3 / 24" */
  readonly position = input('');
  readonly closed = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();

  // Con un solo sticker no se enseñan las flechas ni la posición
  protected readonly canNavigate = computed(() => this.hasPrevious() || this.hasNext());

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Se abre en cuanto el <dialog> existe en la página
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected goToPrevious(): void {
    if (this.hasPrevious()) {
      this.previous.emit();
    }
  }

  protected goToNext(): void {
    if (this.hasNext()) {
      this.next.emit();
    }
  }

  protected closeOnBackdropClick(event: MouseEvent): void {
    // Al pulsar en el fondo oscuro el clic llega al propio <dialog>; dentro del contenido, no
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
