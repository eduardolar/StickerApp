import { inject, Injectable } from '@angular/core';
import { AdsService } from '../../shared/services/ads.service';
import { CachedFile, NativeDeviceService } from '../../shared/services/native-device.service';
import { Sticker } from '../interfaces/sticker.interface';

// Los GIF originales pueden pesar varios MB: solo se guardan en memoria los últimos
const MAX_CACHED_FILES = 10;

@Injectable({ providedIn: 'root' })
export class StickerShareService {
  private readonly device = inject(NativeDeviceService);
  private readonly ads = inject(AdsService);
  private readonly fileCache = new Map<string, Promise<File>>();
  // En la app cada descarga vacía la carpeta share/: compartir y guardar van en fila para no
  // borrar el archivo de una acción que aún no ha terminado
  private nativeQueue: Promise<void> = Promise.resolve();

  /**
   * Descarga el archivo por adelantado (al pasar el ratón o tocar el botón). Safari exige que
   * navigator.share se llame justo después del clic, y esperar a la red puede invalidarlo.
   */
  prefetch(sticker: Sticker): void {
    // En la app no hace falta: el archivo se descarga directo al disco al pulsar
    if (this.device.isNative) {
      return;
    }

    this.fetchFile(sticker).catch(() => {
      // El error se gestionará cuando el usuario pulse el botón
    });
  }

  /**
   * En móvil abre el menú nativo de compartir con el archivo del sticker (elige WhatsApp).
   * Si el navegador no puede compartir archivos, abre WhatsApp con el enlace del sticker.
   */
  async shareOnWhatsApp(sticker: Sticker): Promise<void> {
    if (this.device.isNative) {
      await this.runInNativeQueue(() => this.shareOnWhatsAppNative(sticker));
      return;
    }

    // Sin compartir nativo se va directo: abrir la ventana tras un await haría que la bloquease como popup
    if (typeof navigator.canShare !== 'function') {
      this.openWhatsAppLink(sticker);
      return;
    }

    try {
      const file = await this.fetchFile(sticker);

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: sticker.title });
        return;
      }
    } catch (error: unknown) {
      // El usuario cerró el menú de compartir: no hay que hacer nada más
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to share sticker file, falling back to WhatsApp link.', error);
    }

    this.openWhatsAppLink(sticker);
  }

  /** Copia el enlace del sticker al portapapeles. Lanza un error si el navegador no lo permite. */
  async copyLink(sticker: Sticker): Promise<void> {
    if (this.device.isNative) {
      await this.device.copyText(sticker.shareUrl);
      return;
    }

    await navigator.clipboard.writeText(sticker.shareUrl);
  }

  async download(sticker: Sticker): Promise<void> {
    if (this.device.isNative) {
      await this.runInNativeQueue(() => this.downloadNative(sticker));
      return;
    }

    try {
      const file = await this.fetchFile(sticker);
      const objectUrl = URL.createObjectURL(file);

      // El atributo download no funciona con URLs de otro dominio, por eso se descarga como blob
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      link.click();

      // Firefox y Safari pueden cancelar la descarga si la URL se libera justo después del clic
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: unknown) {
      console.error('Failed to download sticker, opening it in a new tab instead.', error);
      window.open(sticker.originalImageUrl, '_blank', 'noopener,noreferrer');
    }
  }

  private fetchFile(sticker: Sticker): Promise<File> {
    const cachedFile = this.fileCache.get(sticker.id);

    if (cachedFile) {
      return cachedFile;
    }

    if (this.fileCache.size >= MAX_CACHED_FILES) {
      // Un Map recuerda el orden de inserción: la primera clave es la más antigua
      const oldestKey = this.fileCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.fileCache.delete(oldestKey);
      }
    }

    const file = this.downloadFile(sticker);
    this.fileCache.set(sticker.id, file);
    // Si falla, se quita de la caché para poder reintentarlo
    file.catch(() => this.fileCache.delete(sticker.id));

    return file;
  }

  /** Ejecuta la acción cuando acaben las anteriores. Si una falla, la fila sigue con la siguiente. */
  private runInNativeQueue(action: () => Promise<void>): Promise<void> {
    const run = this.nativeQueue.then(action);
    this.nativeQueue = run.catch(() => undefined);
    return run;
  }

  /** En la app el menú de compartir de Android sí acepta archivos (el WebView no tiene navigator.share) */
  private async shareOnWhatsAppNative(sticker: Sticker): Promise<void> {
    try {
      const file = await this.downloadToCache(sticker);
      // El intersticial solo cuando ya se ha compartido (nunca antes ni si se cancela)
      if (await this.device.shareCachedFile(file, 'Enviar sticker')) {
        this.ads.markInterstitialOpportunity();
      }
    } catch (error: unknown) {
      console.error('Failed to share sticker file, falling back to WhatsApp link.', error);
      this.openWhatsAppLink(sticker);
    }
  }

  private async downloadNative(sticker: Sticker): Promise<void> {
    let file: CachedFile;

    try {
      file = await this.downloadToCache(sticker);
    } catch (error: unknown) {
      console.error('Failed to download sticker.', error);
      await this.device.showToast('No se pudo descargar el sticker. Revisa tu conexión.');
      return;
    }

    try {
      await this.device.saveCachedFile(file);
    } catch (error: unknown) {
      // Android 10 o anterior no deja guardar en Documentos sin permisos: el menú de compartir
      // permite guardarlo igualmente (Archivos, Drive...)
      console.error('Failed to save sticker to Documents, opening share menu instead.', error);

      try {
        if (await this.device.shareCachedFile(file, 'Guardar sticker')) {
          this.ads.markInterstitialOpportunity();
        }
      } catch (shareError: unknown) {
        console.error('Failed to share sticker file.', shareError);
        await this.device.showToast('No se pudo guardar el sticker.');
      }
      return;
    }

    await this.device.showToast('Guardado en Documentos/StickerApp');
    this.ads.markInterstitialOpportunity();
  }

  private downloadToCache(sticker: Sticker): Promise<CachedFile> {
    // Sin descargarlo no se sabe el tipo: se mira la extensión de la URL (.webp o .gif)
    const { pathname } = new URL(sticker.originalImageUrl);
    const extension = pathname.endsWith('.webp') ? 'webp' : 'gif';

    return this.device.downloadToCache(
      sticker.originalImageUrl,
      this.toStickerFileName(sticker, extension),
    );
  }

  private openWhatsAppLink(sticker: Sticker): void {
    const text = encodeURIComponent(sticker.shareUrl);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  private async downloadFile(sticker: Sticker): Promise<File> {
    const response = await fetch(sticker.originalImageUrl);

    if (!response.ok) {
      throw new Error(`Sticker download responded with status ${response.status}`);
    }

    const blob = await response.blob();
    const extension = blob.type === 'image/webp' ? 'webp' : 'gif';

    return new File([blob], this.toStickerFileName(sticker, extension), { type: blob.type });
  }

  /** "Gato Feliz" → "gato-feliz-<id>.gif". El id evita que dos stickers con el mismo título se pisen al guardarlos */
  private toStickerFileName(sticker: Sticker, extension: string): string {
    const name =
      sticker.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'sticker';
    const id = sticker.id.replace(/[^\w-]/g, '');

    return `${name}-${id}.${extension}`;
  }
}
