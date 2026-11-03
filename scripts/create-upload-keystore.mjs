// Crea la clave de subida ("upload key") con la que se firma el .aab para Google Play.
// SOLO SE EJECUTA UNA VEZ: si ya existe la clave o android/keystore.properties, no hace nada.
//
// Crea:
//   ~/.stickerapp-signing/stickerapp-upload.jks          la clave (fuera del proyecto, así nunca acaba en git)
//   ~/.stickerapp-signing/LEEME-COPIA-DE-SEGURIDAD.txt   qué guardar y dónde
//   android/keystore.properties                         ruta y contraseña para Gradle (está en .gitignore)
//
// La contraseña se genera al azar y no se muestra por pantalla: solo queda en keystore.properties.
// Uso: node scripts/create-upload-keystore.mjs
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jdkTool, resolveJavaHome } from './java-home.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIGNING_DIR = join(homedir(), '.stickerapp-signing');
const KEYSTORE = join(SIGNING_DIR, 'stickerapp-upload.jks');
const README = join(SIGNING_DIR, 'LEEME-COPIA-DE-SEGURIDAD.txt');
const PROPERTIES = join(projectRoot, 'android', 'keystore.properties');
const ALIAS = 'upload';
const DNAME = 'CN=Eduardo Lara, C=ES';

function fail(message) {
  console.error(`\n[upload-keystore] ${message}\n`);
  process.exit(1);
}

for (const path of [KEYSTORE, PROPERTIES]) {
  if (existsSync(path)) {
    fail(
      `Ya existe ${path}.\n` +
        `  La clave de subida se crea una sola vez: si se sustituye, Google Play rechazará las actualizaciones.\n` +
        `  No se ha tocado nada.`,
    );
  }
}

const javaHome = resolveJavaHome(fail);
const keytool = jdkTool(javaHome, 'keytool');
// La contraseña solo viaja en el entorno del proceso hijo: nunca en la línea de comandos ni en pantalla
const password = randomBytes(32).toString('base64url');
const childEnv = { ...process.env, SIGN_PASS: password };

mkdirSync(SIGNING_DIR, { recursive: true });

console.log('[upload-keystore] Generando la clave de subida (RSA 2048, válida 10000 días)...');
const generated = spawnSync(
  keytool,
  [
    '-genkeypair', '-v',
    '-storetype', 'PKCS12',
    '-keystore', KEYSTORE,
    '-alias', ALIAS,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', '10000',
    '-dname', DNAME,
    '-storepass:env', 'SIGN_PASS',
    '-keypass:env', 'SIGN_PASS',
  ],
  { env: childEnv, stdio: 'inherit' },
);
if (generated.error || generated.status !== 0) {
  // Si keytool dejó un archivo a medias se borra: no sirve sin su contraseña
  rmSync(KEYSTORE, { force: true });
  fail(`keytool falló${generated.error ? `: ${generated.error.message}` : ` (código ${generated.status})`}.`);
}

// Gradle lee rutas con "/" también en Windows; en .properties "\" sería un carácter de escape
const storeFile = KEYSTORE.replaceAll('\\', '/');
writeFileSync(
  PROPERTIES,
  [
    '# Firma de la versión release para Google Play. NO subir a git ni compartir.',
    '# Copia de seguridad: ver ' + README.replaceAll('\\', '/'),
    `storeFile=${storeFile}`,
    `storePassword=${password}`,
    `keyAlias=${ALIAS}`,
    `keyPassword=${password}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
);

writeFileSync(
  README,
  `CLAVE DE SUBIDA DE STICKERAPP (Google Play)
============================================

Qué es esto
-----------
Con esta clave se firma la app antes de subirla a Google Play. Google solo acepta
actualizaciones firmadas con ella.

Archivos importantes:
  1. ${KEYSTORE}
     La clave en sí.
  2. ${PROPERTIES}
     La ruta de la clave y su CONTRASEÑA (líneas storePassword y keyPassword; las dos son
     la misma). La contraseña no está guardada en ningún otro sitio.

Haz una copia de seguridad YA, en dos sitios distintos
------------------------------------------------------
  - En un gestor de contraseñas (Bitwarden, 1Password, KeePass...): crea una entrada
    "StickerApp - clave de subida", pega la contraseña y adjunta el archivo .jks.
  - En un USB o en tu nube personal: copia el archivo .jks y keystore.properties.

Normas
------
  - No los compartas con nadie ni los mandes por correo o chat.
  - No los subas nunca a git, GitHub ni a ningún repositorio.
  - No ejecutes otra vez el script que los creó: haría una clave distinta.

Si se pierden
-------------
Sin la clave o sin su contraseña no se pueden publicar actualizaciones. Habría que pedir a
Google un restablecimiento de la clave de subida (Play Console > Prueba y publica >
Configuración > Integridad de la aplicación > Firma de aplicaciones > Solicitar
restablecimiento de la clave de subida) y esperar a que lo aprueben, lo que puede tardar días.
`,
);

// La huella SHA-256 no es secreta: es la que muestra Play Console para comprobar el certificado
const listed = spawnSync(
  keytool,
  ['-list', '-v', '-keystore', KEYSTORE, '-alias', ALIAS, '-storepass:env', 'SIGN_PASS'],
  { env: childEnv, encoding: 'utf8' },
);
const fingerprint = (listed.stdout ?? '').split(/\r?\n/).find((line) => line.trim().startsWith('SHA256:'));

console.log(`\n[upload-keystore] Listo.`);
console.log(`  Clave:        ${KEYSTORE}`);
console.log(`  Propiedades:  ${PROPERTIES}`);
console.log(`  Léeme:        ${README}`);
if (fingerprint) console.log(`  Certificado ${fingerprint.trim()}`);
console.log('\n  IMPORTANTE: haz ahora la copia de seguridad que explica el Léeme.');
