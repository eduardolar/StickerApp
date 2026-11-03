import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { FileTransfer } from '@capacitor/file-transfer';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { blobToBase64 } from '../utils/blob-to-base64';

// Carpeta de la caché que puede leer el menú de compartir (ver android/.../res/xml/file_paths.xml)
const SHARE_FOLDER = 'share';
const SAVE_FOLDER = 'StickerApp';

/** Archivo descargado en la caché de la app, listo para compartir o guardar */
export interface CachedFile {
  name: string;
  /** Ruta dentro de la caché */
  path: string;
  uri: string;
}

/** El plugin Share rechaza con "Share canceled" cuando el usuario cierra el menú sin elegir nada */
function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && /cancel/i.test(error.message);
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  return response.blob();
}

/**
 * Funciones del móvil cuando la web corre dentro de la app Android (Capacitor).
 * Es el único sitio que importa los plugins: el resto de la app pregunta `isNative` y llama aquí.
 */
@Injectable({ providedIn: 'root' })
export class NativeDeviceService {
  readonly isNative = Capacitor.isNativePlatform();

  async copyText(text: string): Promise<void> {
    await Clipboard.write({ string: text });
  }

  /**
   * Descarga el archivo en la caché de la app. Antes vacía la carpeta: solo hace falta el último
   * archivo y así no crece con cada sticker compartido. Por eso quien llama no debe empezar otra
   * descarga hasta terminar con el archivo anterior (StickerShareService las pone en fila).
   */
  async downloadToCache(url: string, fileName: string): Promise<CachedFile> {
    // Los dos fallan sin más si la carpeta no existía o ya existe; si fuera otra cosa, fallará la descarga
    await Filesystem.rmdir({ path: SHARE_FOLDER, directory: Directory.Cache, recursive: true }).catch(
      () => undefined,
    );
    await Filesystem.mkdir({ path: SHARE_FOLDER, directory: Directory.Cache, recursive: true }).catch(
      () => undefined,
    );

    const path = `${SHARE_FOLDER}/${fileName}`;
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });

    try {
      // De internet al disco directamente: un GIF de varios MB no cruza el puente web-Android en base64
      await FileTransfer.downloadFile({ url, path: uri });
    } catch (error: unknown) {
      // En Android 10 o anterior el plugin exige permiso de almacenamiento (que la app no pide)
      // incluso para la caché: ahí se descarga en el WebView y se escribe en base64, como antes
      console.warn('Direct download failed, retrying through the WebView.', error);
      await Filesystem.writeFile({
        path,
        data: await blobToBase64(await fetchBlob(url)),
        directory: Directory.Cache,
      });
    }

    return { name: fileName, path, uri };
  }

  /**
   * Abre el menú de compartir de Android con un archivo de la caché. Si el usuario lo cierra sin
   * elegir, no es un error: devuelve `false` (y `true` si eligió una app).
   */
  async shareCachedFile(file: CachedFile, dialogTitle: string): Promise<boolean> {
    try {
      await Share.share({ files: [file.uri], dialogTitle });
      return true;
    } catch (error: unknown) {
      if (!isShareCancelled(error)) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Copia un archivo de la caché a Documentos/StickerApp. Sin pedir permisos de almacenamiento:
   * en Android 10 o anteriores fallará y quien llama debe ofrecer otra salida.
   */
  async saveCachedFile(file: CachedFile): Promise<void> {
    // copy() no crea la carpeta de destino; si ya existe, mkdir falla y no pasa nada
    await Filesystem.mkdir({ path: SAVE_FOLDER, directory: Directory.Documents, recursive: true }).catch(
      () => undefined,
    );
    await Filesystem.copy({
      from: file.path,
      directory: Directory.Cache,
      to: `${SAVE_FOLDER}/${file.name}`,
      toDirectory: Directory.Documents,
    });
  }

  async showToast(text: string): Promise<void> {
    await Toast.show({ text });
  }
}
