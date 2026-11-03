// Lanza una tarea de Gradle del proyecto Android con el JDK 21 y el SDK de Android correctos,
// sin depender de las variables de entorno globales del equipo.
// Uso: node scripts/android-gradle.mjs <tarea> [--allow-test-ads]   (p. ej. assembleDebug, bundleRelease)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveJavaHome } from './java-home.mjs';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(projectRoot, 'android');
const isWindows = process.platform === 'win32';

// ID de editor de los anuncios de PRUEBA de Google (va en su ID de app y en sus bloques de prueba)
const TEST_PUBLISHER_ID = '3940256099942544';
const STRINGS_XML = join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const ADS_CONFIG_TS = join(projectRoot, 'src', 'app', 'shared', 'config', 'ads.config.ts');
const ENVIRONMENT_TS = join(projectRoot, 'src', 'environments', 'environment.ts');
const KLIPY_KEY_PLACEHOLDER = 'TU_API_KEY_DE_KLIPY';
const ALLOW_TEST_ADS_FLAG = '--allow-test-ads';

// Dónde deja Gradle el resultado de cada tarea habitual
const ARTIFACTS = {
  assembleDebug: 'app/build/outputs/apk/debug/app-debug.apk',
  assembleRelease: 'app/build/outputs/apk/release/app-release.apk',
  bundleDebug: 'app/build/outputs/bundle/debug/app-debug.aab',
  bundleRelease: 'app/build/outputs/bundle/release/app-release.aab',
};

function fail(message) {
  console.error(`\n[android-gradle] ${message}\n`);
  process.exit(1);
}

function resolveAndroidHome() {
  const androidHome =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk');

  if (!existsSync(androidHome)) {
    fail(
      `No se encuentra el SDK de Android en "${androidHome}".\n` +
        `  Instálalo desde Android Studio (SDK Manager) o define la variable ANDROID_HOME.`,
    );
  }

  return androidHome;
}

/** Motivos por los que la versión release llevaría anuncios de prueba o IDs sin rellenar (vacío si está bien) */
function findTestAdsProblems() {
  const problems = [];

  const strings = readFileSync(STRINGS_XML, 'utf8');
  const appId = strings.match(/<string name="admob_app_id">([^<]*)<\/string>/)?.[1];

  if (!appId) {
    problems.push('strings.xml: no se encuentra admob_app_id.');
  } else if (appId.includes(TEST_PUBLISHER_ID)) {
    problems.push(`strings.xml: admob_app_id es el ID de PRUEBA de Google (${appId}).`);
  } else if (/XXXX/i.test(appId)) {
    problems.push('strings.xml: admob_app_id todavía tiene XXXX.');
  }

  const adsConfig = readFileSync(ADS_CONFIG_TS, 'utf8');
  // Se exige el false literal: cualquier otra cosa (true, una condición...) no se puede comprobar desde aquí
  if (!/\bconst useTestAds\s*=\s*false\s*;/.test(adsConfig)) {
    problems.push('ads.config.ts: useTestAds no es false.');
  }

  const realAdUnits = adsConfig.match(/const REAL_AD_UNITS\s*=\s*\{([\s\S]*?)\}/)?.[1];
  if (realAdUnits === undefined) {
    problems.push('ads.config.ts: no se encuentra REAL_AD_UNITS.');
  } else if (/XXXX/i.test(realAdUnits)) {
    problems.push('ads.config.ts: REAL_AD_UNITS todavía tiene XXXX en vez de tus IDs de bloque.');
  } else if (realAdUnits.includes(TEST_PUBLISHER_ID)) {
    problems.push('ads.config.ts: REAL_AD_UNITS tiene IDs de PRUEBA de Google.');
  }

  return problems;
}

/** Motivo por el que falta la API key de KLIPY en environment.ts (null si está puesta). Nunca incluye la clave */
function findKlipyKeyProblem() {
  if (!existsSync(ENVIRONMENT_TS)) {
    return 'no existe src/environments/environment.ts (cópialo de environment.example.ts).';
  }

  const environment = readFileSync(ENVIRONMENT_TS, 'utf8');
  const key = environment.match(/\bklipyApiKey\s*:\s*(['"`])(.*?)\1/)?.[2];

  if (key === undefined) {
    return 'environment.ts no tiene klipyApiKey.';
  }
  if (!key.trim() || key === KLIPY_KEY_PLACEHOLDER) {
    return 'klipyApiKey está vacía o con el texto de ejemplo en environment.ts.';
  }
  return null;
}

function printTestAdsWarning(problems) {
  const line = '#'.repeat(78);
  console.warn(
    `\n${line}\n` +
      `#  ATENCIÓN: esta versión lleva ANUNCIOS DE PRUEBA o IDs de AdMob sin rellenar.\n` +
      `#  Úsala SOLO para la prueba interna o cerrada de Google Play. NUNCA en producción.\n` +
      `${line}\n` +
      problems.map((problem) => `  - ${problem}`).join('\n') +
      '\n',
  );
}

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith('--'));
const task = args.find((arg) => !arg.startsWith('--'));
const unknownFlags = flags.filter((flag) => flag !== ALLOW_TEST_ADS_FLAG);

// La tarea acaba en la línea de comandos de cmd.exe: solo se aceptan nombres de tarea normales
if (!task || !/^[\w:-]+$/.test(task)) {
  fail('Indica una tarea de Gradle válida. Ejemplo: node scripts/android-gradle.mjs assembleDebug');
}

if (unknownFlags.length > 0) {
  fail(`Opción desconocida: ${unknownFlags.join(' ')}. La única opción es ${ALLOW_TEST_ADS_FLAG}.`);
}

const isRelease = /release/i.test(task);
const allowTestAds = flags.includes(ALLOW_TEST_ADS_FLAG) || process.env.ALLOW_TEST_ADS === '1';

if (!existsSync(androidDir)) {
  fail('No existe la carpeta android. Ejecuta primero: npx cap add android');
}

if (isRelease && !existsSync(join(androidDir, 'keystore.properties'))) {
  fail(
    `Falta android/keystore.properties: sin él la versión release no se puede firmar para Google Play.\n` +
      `  Créalo con storeFile, storePassword, keyAlias y keyPassword (ver README, sección Android).`,
  );
}

// Sin la clave de KLIPY la app no carga ningún sticker. --allow-test-ads no lo salta: solo afecta a los anuncios
const klipyKeyProblem = isRelease ? findKlipyKeyProblem() : null;

if (klipyKeyProblem) {
  fail(
    `La versión release necesita la API key de KLIPY: ${klipyKeyProblem}\n` +
      `  Créala en https://partner.klipy.com y ponla en klipyApiKey (play-store/pasos-para-publicar.md, paso 2).`,
  );
}

// La versión release es la que va a Google Play: con anuncios de prueba no da dinero y con los IDs a
// medias la app se cierra al abrirse. Se para aquí salvo que se pida a propósito para las pruebas
const testAdsProblems = isRelease ? findTestAdsProblems() : [];

if (testAdsProblems.length > 0) {
  if (!allowTestAds) {
    fail(
      `La versión release no puede llevar anuncios de prueba ni IDs sin rellenar:\n` +
        testAdsProblems.map((problem) => `  - ${problem}`).join('\n') +
        `\n\n  Para producción, pon los IDs reales (README, sección Anuncios).\n` +
        `  Para la prueba interna o cerrada: npm run android:bundle:pruebas\n` +
        `  (equivale a añadir ${ALLOW_TEST_ADS_FLAG} o a definir la variable ALLOW_TEST_ADS=1).`,
    );
  }

  printTestAdsWarning(testAdsProblems);
}

const javaHome = resolveJavaHome(fail);
const androidHome = resolveAndroidHome();

console.log(`[android-gradle] JAVA_HOME = ${javaHome}`);
console.log(`[android-gradle] ANDROID_HOME = ${androidHome}`);
console.log(`[android-gradle] Ejecutando gradlew ${task}...\n`);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${join(javaHome, 'bin')}${isWindows ? ';' : ':'}${process.env.PATH ?? ''}`,
};

// Node no permite lanzar un .bat directamente: en Windows se pasa por cmd.exe.
// Se usa la ruta completa porque cmd puede tener desactivada la búsqueda en la carpeta actual
// (NoDefaultCurrentDirectoryInExePath). Con /s, cmd quita las comillas exteriores y deja la ruta entre comillas
const gradlewBat = join(androidDir, 'gradlew.bat');
const result = isWindows
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', `""${gradlewBat}" ${task} --console=plain"`], {
      cwd: androidDir,
      env,
      stdio: 'inherit',
      windowsVerbatimArguments: true,
    })
  : spawnSync('./gradlew', [task, '--console=plain'], { cwd: androidDir, env, stdio: 'inherit' });

if (result.error) {
  fail(`No se pudo ejecutar Gradle: ${result.error.message}`);
}

if (result.status !== 0) {
  fail(`Gradle terminó con errores (código ${result.status}).`);
}

const artifact = ARTIFACTS[task];
const artifactPath = artifact ? join(androidDir, artifact) : null;

if (artifactPath && existsSync(artifactPath)) {
  console.log(`\n[android-gradle] Listo: ${artifactPath}`);
} else {
  console.log(
    `\n[android-gradle] Listo. Busca el resultado en ${relative(process.cwd(), join(androidDir, 'app', 'build', 'outputs'))}`,
  );
}

// Se repite al final para que no se pierda entre la salida de Gradle
if (testAdsProblems.length > 0) {
  printTestAdsWarning(testAdsProblems);
}
