export interface KlipyStickerResponse {
  result: boolean;
  data?: {
    data: KlipySticker[];
    current_page?: number;
    per_page?: number;
    has_next?: boolean;
  };
  errors?: {
    message?: string[];
  };
}

export type KlipyFileSize = 'hd' | 'md' | 'sm' | 'xs';
export type KlipyFileFormat = 'gif' | 'webp' | 'webm' | 'png' | 'jpg' | 'mp4';

export interface KlipyMediaFile {
  url: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface KlipySticker {
  id: number;
  slug: string;
  title: string;
  file?: Partial<Record<KlipyFileSize, Partial<Record<KlipyFileFormat, KlipyMediaFile>>>>;
  tags?: string[];
  /** 'sticker' o 'ad' (anuncio de KLIPY, solo si se activan en su panel) */
  type?: string;
  blur_preview?: string;
}
