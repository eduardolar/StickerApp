// Busca el JDK 21 (el que necesitan Gradle y keytool). Lo comparten android-gradle.mjs y
// create-upload-keystore.mjs.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const isWindows = process.platform === 'win32';

function hasJava(javaHome) {
  return existsSync(join(javaHome, 'bin', isWindows ? 'java.exe' : 'java'));
}

/** Ruta de un ejecutable del JDK (java, keytool, jarsigner...) con la extensión de cada sistema. */
export function jdkTool(javaHome, tool) {
  return join(javaHome, 'bin', isWindows ? `${tool}.exe` : tool);
}

/** Devuelve la carpeta del JDK 21. Si no la encuentra llama a `fail` con un mensaje explicando qué hacer. */
export function resolveJavaHome(fail) {
  const fromEnv = process.env.JAVA_HOME_21;
  if (fromEnv) {
    if (!hasJava(fromEnv)) {
      fail(`JAVA_HOME_21 apunta a "${fromEnv}", pero ahí no hay bin/java.`);
    }
    return fromEnv;
  }

  // Android Studio / IntelliJ descargan los JDK en ~/.jdks. Se busca un 21 exacto
  // (no vale un 26.0.21) y, si hay varios, el más reciente
  const jdksDir = join(homedir(), '.jdks');
  const candidates = existsSync(jdksDir)
    ? readdirSync(jdksDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => /(^|\D)21(\D|$)/.test(name))
        .sort((a, b) => Number(b.startsWith('jdk-21')) - Number(a.startsWith('jdk-21')) || b.localeCompare(a, undefined, { numeric: true }))
        .map((name) => join(jdksDir, name))
        .filter(hasJava)
    : [];

  if (candidates.length === 0) {
    fail(
      `No se encuentra el JDK 21 (Gradle no funciona con otras versiones).\n` +
        `  - Instálalo en ${jdksDir} (Android Studio: File > Settings > Build Tools > Gradle > Gradle JDK > Download JDK > versión 21), o\n` +
        `  - define la variable de entorno JAVA_HOME_21 con la carpeta del JDK 21.`,
    );
  }

  return candidates[0];
}
