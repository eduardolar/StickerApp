/**
 * Lee un valor guardado en localStorage y lo convierte de texto (JSON) a dato.
 * Si no hay nada, el JSON está roto o el navegador bloquea el storage, devuelve `fallback`.
 */
export function readFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Guarda un valor en localStorage convertido a texto (JSON). */
export function saveToLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error: unknown) {
    // Puede fallar si el storage está lleno (unos 5 MB) o bloqueado
    console.error(`Failed to save "${key}" to localStorage.`, error);
  }
}
