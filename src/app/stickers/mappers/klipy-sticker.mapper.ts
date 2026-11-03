import {
  KlipyFileFormat,
  KlipyFileSize,
  KlipyMediaFile,
  KlipySticker,
} from '../interfaces/klipy-sticker-response.interface';
import { Sticker } from '../interfaces/sticker.interface';

// WebP primero: pesa menos y conserva la transparencia
const IMAGE_FORMATS: KlipyFileFormat[] = ['webp', 'gif'];
// md basta para la cuadrícula; los demás tamaños solo por si falta
const PREVIEW_SIZES: KlipyFileSize[] = ['md', 'sm', 'hd', 'xs'];
const ORIGINAL_SIZES: KlipyFileSize[] = ['hd', 'md'];

function findFile(
  sticker: KlipySticker,
  sizes: KlipyFileSize[],
  formats: KlipyFileFormat[],
): KlipyMediaFile | undefined {
  for (const size of sizes) {
    for (const format of formats) {
      const file = sticker.file?.[size]?.[format];
      if (file?.url) {
        return file;
      }
    }
  }
  return undefined;
}

function mapKlipyStickerToSticker(klipySticker: KlipySticker): Sticker | null {
  const preview = findFile(klipySticker, PREVIEW_SIZES, IMAGE_FORMATS);

  if (klipySticker.type === 'ad' || !preview) {
    return null;
  }

  const originalImageUrl =
    findFile(klipySticker, ORIGINAL_SIZES, IMAGE_FORMATS)?.url ?? preview.url;

  return {
    id: String(klipySticker.id),
    title: klipySticker.title ?? '',
    imageUrl: preview.url,
    width: preview.width || undefined,
    height: preview.height || undefined,
    originalImageUrl,
    shareUrl: findFile(klipySticker, ORIGINAL_SIZES, ['gif'])?.url ?? originalImageUrl,
  };
}

export function mapKlipyStickersToStickers(klipyStickers: KlipySticker[]): Sticker[] {
  return klipyStickers
    .map(mapKlipyStickerToSticker)
    .filter((sticker): sticker is Sticker => sticker !== null);
}
