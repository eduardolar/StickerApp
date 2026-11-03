import { Sticker } from '../interfaces/sticker.interface';

// Lo que ocupa cada tarjeta además de la imagen (relleno + hueco entre tarjetas), relativo al ancho de la columna.
// Sin esto, una columna con muchos stickers bajitos acababa más larga de lo calculado
const ITEM_OVERHEAD = 0.2;

/** Alto relativo al ancho (todas las columnas miden lo mismo de ancho). Sin medidas, se supone cuadrado. */
function getAspectRatio({ width, height }: Sticker): number {
  return width && height ? height / width : 1;
}

/**
 * Reparte los stickers en `count` columnas poniendo cada uno en la que va más corta.
 * Cada sticker solo depende de los anteriores: al añadir más al final, los que ya estaban no se mueven
 * (con las columnas CSS se recolocaban todos y la pantalla daba saltos con el scroll infinito).
 */
export function distributeInColumns(stickers: Sticker[], count: number): Sticker[][] {
  const columnCount = Math.max(1, Math.floor(count));
  const columns: Sticker[][] = Array.from({ length: columnCount }, () => []);
  const heights: number[] = new Array(columnCount).fill(0);

  for (const sticker of stickers) {
    // Con empate gana la primera columna, para que el resultado sea siempre el mismo
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(sticker);
    heights[shortest] += getAspectRatio(sticker) + ITEM_OVERHEAD;
  }

  return columns;
}
