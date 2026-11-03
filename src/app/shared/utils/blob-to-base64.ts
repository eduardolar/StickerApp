/**
 * Convierte un archivo a texto en base64 (sin el prefijo "data:image/gif;base64,").
 * Los plugins nativos solo reciben texto: no se les puede pasar un Blob directamente.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result);
      const commaIndex = dataUrl.indexOf(',');
      // Con un archivo vacío algunos navegadores devuelven solo "data:" (sin coma)
      resolve(commaIndex === -1 ? '' : dataUrl.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));

    reader.readAsDataURL(blob);
  });
}
