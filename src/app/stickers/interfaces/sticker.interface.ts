export interface Sticker {
  id: string;
  title: string;
  imageUrl: string;
  /** Dimensiones de imageUrl; opcionales porque el historial guardado antes no las tiene */
  width?: number;
  height?: number;
  /** Imagen a tamaño original (WebP si existe, conserva la transparencia) para compartir o descargar */
  originalImageUrl: string;
  /** Enlace que se copia o se envía por WhatsApp (el GIF se previsualiza bien en los chats) */
  shareUrl: string;
}
