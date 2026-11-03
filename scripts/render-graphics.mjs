// Genera todas las imágenes de marca de StickerApp a partir de dos fuentes:
//   - assets/source/logo.svg                          (logo; de él salen también los iconos)
//   - play-store/graficos/fuente/feature-graphic.html (gráfico destacado de Google Play)
//
// Resultado:
//   assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
//     -> los usa `npx @capacitor/assets generate --android` para crear los mipmap y el splash
//   play-store/graficos/icono-512.png y grafico-destacado-1024x500.png -> se suben a Play Console
//   public/favicon.ico (16, 32 y 48 px)
//
// Uso: node scripts/render-graphics.mjs [--keep-temp]
// Se puede ejecutar las veces que haga falta: sobrescribe los resultados.
//
// Necesita Microsoft Edge (se usa en modo headless: no abre ninguna ventana y usa un perfil
// temporal propio, así que no toca la sesión del navegador) y Python 3 con Pillow.
// Variables opcionales: EDGE_PATH, PYTHON, GRAPHICS_TMP_DIR (carpeta donde crear los temporales).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const keepTemp = process.argv.includes('--keep-temp');

const LOGO_SVG = join(projectRoot, 'assets', 'source', 'logo.svg');
const FEATURE_HTML = join(projectRoot, 'play-store', 'graficos', 'fuente', 'feature-graphic.html');
const ASSETS_DIR = join(projectRoot, 'assets');
const PLAY_DIR = join(projectRoot, 'play-store', 'graficos');
const FAVICON = join(projectRoot, 'public', 'favicon.ico');

const SPLASH_BACKGROUND = '#020617'; // slate-950, el mismo fondo que la app y capacitor.config.ts
const SPLASH_SIZE = 2732;
const SPLASH_LOGO_SIZE = 512;
// Tamaño de la "S" en el icono adaptable respecto al logo: queda dentro de la zona segura
// central (~61 %) aunque el lanzador recorte el icono en círculo
const FOREGROUND_SCALE = 0.66;

// Variantes del logo: qué grupos del SVG se muestran (ver comentario dentro de logo.svg)
const SHOW_FULL_SQUARE = '#tile, #peel { display: none; } #tile-full { display: inline; }';
const VARIANTS = {
  // Cuadrado a sangre: el sistema (o Google Play) le aplica su propia máscara redondeada
  'icon-only': { css: SHOW_FULL_SQUARE },
  'icon-foreground': { css: '#tile, #tile-full, #peel { display: none; }', scale: FOREGROUND_SCALE },
  'icon-background': { css: `${SHOW_FULL_SQUARE} #mark { display: none; }` },
  // Logo completo, con la esquina despegada (fondo transparente)
  logo: { css: '' },
  // Favicon: sin esquina ni sombras, que a 16 px solo serían ruido
  favicon: { css: '#tile, #tile-full, #peel { display: none; } #tile-round { display: inline; } #mark { filter: none; }' },
};

function fail(message) {
  console.error(`\n[render-graphics] ${message}\n`);
  process.exit(1);
}

function findEdge() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const edge = candidates.find((path) => existsSync(path));
  if (!edge) {
    fail('No se encuentra Microsoft Edge. Indica la ruta de msedge.exe en la variable EDGE_PATH.');
  }
  return edge;
}

function findPython() {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const check = spawnSync(python, ['-c', 'import PIL; print(PIL.__version__)'], { encoding: 'utf8' });
  if (check.status !== 0) {
    fail(`Hace falta Python 3 con Pillow ("${python}" no lo tiene). Instálalo con: ${python} -m pip install Pillow`);
  }
  return python;
}

for (const source of [LOGO_SVG, FEATURE_HTML]) {
  if (!existsSync(source)) fail(`Falta la fuente ${relative(projectRoot, source)}`);
}

const edge = findEdge();
const python = findPython();
const tmpBase = process.env.GRAPHICS_TMP_DIR || tmpdir();
mkdirSync(tmpBase, { recursive: true });
const workDir = mkdtempSync(join(tmpBase, 'stickerapp-graphics-'));
// Perfil nuevo y desechable para Edge: nunca usa ni modifica el perfil del usuario
const edgeProfile = join(workDir, 'edge-profile-design');

/** Hace una captura de una página con Edge headless (sin ventanas) y devuelve la ruta del PNG. */
function screenshot(pagePath, width, height, outName) {
  const out = join(workDir, outName);
  const result = spawnSync(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--user-data-dir=${edgeProfile}`,
      '--default-background-color=00000000',
      '--force-device-scale-factor=1',
      '--no-first-run',
      '--no-default-browser-check',
      '--allow-file-access-from-files', // para cargar la fuente Inter y el logo desde disco
      '--virtual-time-budget=3000', // deja tiempo a que cargue la fuente antes de la captura
      `--window-size=${width},${height}`,
      `--screenshot=${out}`,
      pathToFileURL(pagePath).href,
    ],
    { encoding: 'utf8', timeout: 90_000 },
  );
  if (!existsSync(out)) {
    fail(`Edge no generó ${outName}.\n${result.error ?? ''}${result.stderr ?? ''}`);
  }
  return out;
}

/** Crea una página con el logo SVG en línea, mostrando solo los grupos de la variante pedida. */
function renderLogoVariant(name, size) {
  const { css, scale = 1 } = VARIANTS[name];
  let svg = readFileSync(LOGO_SVG, 'utf8').replace(/<\?xml[^>]*>/, '');
  if (scale !== 1) {
    // Alejar la cámara: la marca se ve más pequeña y centrada en el mismo lienzo
    const side = 1024 / scale;
    const offset = -(side - 1024) / 2;
    svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${offset} ${offset} ${side} ${side}"`);
  }
  const page = join(workDir, `${name}-${size}.html`);
  writeFileSync(
    page,
    `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
svg { display: block; width: ${size}px; height: ${size}px; }
${css}
</style></head><body>${svg}</body></html>`,
  );
  return screenshot(page, size, size, `${name}-${size}.png`);
}

console.log(`[render-graphics] Renderizando con Edge headless en ${workDir}`);
const shots = {
  iconOnly: renderLogoVariant('icon-only', 1024),
  iconForeground: renderLogoVariant('icon-foreground', 1024),
  iconBackground: renderLogoVariant('icon-background', 1024),
  playIcon: renderLogoVariant('icon-only', 512),
  splashLogo: renderLogoVariant('logo', SPLASH_LOGO_SIZE),
  favicon: renderLogoVariant('favicon', 256),
  feature: screenshot(FEATURE_HTML, 1024, 500, 'feature-graphic.png'),
};

// Ajustes finales con Pillow: modo de color (con o sin alfa), lienzo del splash y favicon
const jobs = [
  { type: 'save', src: shots.iconOnly, dst: join(ASSETS_DIR, 'icon-only.png'), size: [1024, 1024], mode: 'RGB' },
  { type: 'save', src: shots.iconForeground, dst: join(ASSETS_DIR, 'icon-foreground.png'), size: [1024, 1024], mode: 'RGBA' },
  { type: 'save', src: shots.iconBackground, dst: join(ASSETS_DIR, 'icon-background.png'), size: [1024, 1024], mode: 'RGB' },
  { type: 'splash', src: shots.splashLogo, dst: join(ASSETS_DIR, 'splash.png'), size: SPLASH_SIZE, background: SPLASH_BACKGROUND },
  { type: 'splash', src: shots.splashLogo, dst: join(ASSETS_DIR, 'splash-dark.png'), size: SPLASH_SIZE, background: SPLASH_BACKGROUND },
  // Play pide PNG de 32 bits (RGBA) para el icono y JPEG o PNG de 24 bits (sin alfa) para el gráfico
  { type: 'save', src: shots.playIcon, dst: join(PLAY_DIR, 'icono-512.png'), size: [512, 512], mode: 'RGBA' },
  { type: 'save', src: shots.feature, dst: join(PLAY_DIR, 'grafico-destacado-1024x500.png'), size: [1024, 500], mode: 'RGB', background: SPLASH_BACKGROUND },
  { type: 'ico', src: shots.favicon, dst: FAVICON, sizes: [16, 32, 48] },
];

const POSTPROCESS_PY = String.raw`
import json, os, sys
from PIL import Image

def solid(color, size):
    return Image.new('RGBA', size, color)

jobs = json.load(open(sys.argv[1], encoding='utf-8'))
for job in jobs:
    os.makedirs(os.path.dirname(job['dst']), exist_ok=True)
    im = Image.open(job['src']).convert('RGBA')
    if job['type'] == 'save':
        size = tuple(job['size'])
        if im.size != size:
            print(f"  aviso: {os.path.basename(job['src'])} mide {im.size}, se ajusta a {size}")
            im = im.resize(size, Image.LANCZOS)
        if job['mode'] == 'RGB':
            # Aplanar sobre un color de fondo: el PNG queda de 24 bits, sin canal alfa
            im = Image.alpha_composite(solid(job.get('background', '#000000'), size), im).convert('RGB')
        im.save(job['dst'], optimize=True)
    elif job['type'] == 'splash':
        canvas = solid(job['background'], (job['size'], job['size']))
        offset = ((job['size'] - im.width) // 2, (job['size'] - im.height) // 2)
        canvas.alpha_composite(im, offset)
        canvas.convert('RGB').save(job['dst'], optimize=True)
    elif job['type'] == 'ico':
        im.save(job['dst'], format='ICO', sizes=[(s, s) for s in job['sizes']])

for job in jobs:
    out = Image.open(job['dst'])
    extra = ' (' + ', '.join(f'{w}x{h}' for w, h in sorted(out.info.get('sizes', []))) + ')' if job['type'] == 'ico' else ''
    print(f"  {job['dst']}: {out.size[0]}x{out.size[1]} {out.mode}{extra}, {os.path.getsize(job['dst']) / 1024:.0f} KB")
`;

const jobsFile = join(workDir, 'jobs.json');
const scriptFile = join(workDir, 'postprocess.py');
writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
writeFileSync(scriptFile, POSTPROCESS_PY);
const post = spawnSync(python, [scriptFile, jobsFile], { stdio: 'inherit' });
if (post.status !== 0) fail('Falló el procesado con Pillow.');

if (keepTemp) {
  console.log(`[render-graphics] Temporales conservados en ${workDir}`);
} else {
  rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
console.log('[render-graphics] Listo. Siguiente paso: npx @capacitor/assets generate --android');
