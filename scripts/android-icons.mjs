// Genera los iconos de lanzador de Android a partir de assets/icon-only.png, icon-foreground.png e
// icon-background.png (los crea `npm run graphics`).
//
// Por qué existe: @capacitor/assets 3.0.5 crea las capas del icono adaptable al tamaño del icono
// normal (72 px en hdpi en vez de 162 px = 108dp) y las mete en un <inset 16.7%>, así que en el
// móvil se ven borrosas y la "S" sale a 2/3 del tamaño que diseñamos. Este script se ejecuta
// DESPUÉS de @capacitor/assets (que sigue generando el splash) y sobrescribe los iconos.
//
// Resultado en android/app/src/main/res:
//   mipmap-{mdpi..xxxhdpi}/ic_launcher.png, ic_launcher_round.png      (Android 7, sin icono adaptable)
//   mipmap-{mdpi..xxxhdpi}/ic_launcher_foreground.png, _background.png (capas de 108dp)
//   mipmap-anydpi-v26/ic_launcher.xml, ic_launcher_round.xml          (icono adaptable, Android 8+)
// y borra los restos de la plantilla de Capacitor (robot de Android y fondo de cuadrícula).
//
// Uso: node scripts/android-icons.mjs   (necesita Python 3 con Pillow; variable opcional PYTHON)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(projectRoot, 'assets');
const RES_DIR = join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const ICON_BACKGROUND_COLOR = '#6366F1'; // indigo-500, el color principal del logo

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// Restos de la plantilla, o de @capacitor/assets (ldpi a baja resolución), que ya no se usan
const LEFTOVERS = [
  'drawable-v24/ic_launcher_foreground.xml',
  'drawable/ic_launcher_background.xml',
  'mipmap-ldpi',
];

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const BACKGROUND_COLOR_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ICON_BACKGROUND_COLOR}</color>
</resources>
`;

function fail(message) {
  console.error(`\n[android-icons] ${message}\n`);
  process.exit(1);
}

function findPython() {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const check = spawnSync(python, ['-c', 'import PIL'], { encoding: 'utf8' });
  if (check.status !== 0) {
    fail(`Hace falta Python 3 con Pillow ("${python}" no lo tiene). Instálalo con: ${python} -m pip install Pillow`);
  }
  return python;
}

const sources = {
  iconOnly: join(ASSETS_DIR, 'icon-only.png'),
  foreground: join(ASSETS_DIR, 'icon-foreground.png'),
  background: join(ASSETS_DIR, 'icon-background.png'),
};
for (const source of Object.values(sources)) {
  if (!existsSync(source)) fail(`Falta ${relative(projectRoot, source)}. Genéralo con: npm run graphics`);
}
if (!existsSync(RES_DIR)) fail('No existe android/app/src/main/res. Ejecuta primero: npx cap add android');

const ICONS_PY = String.raw`
import json, os, sys
from PIL import Image, ImageDraw

cfg = json.load(open(sys.argv[1], encoding='utf-8'))
SS = 4  # supermuestreo para que el borde de las máscaras salga suavizado

def masked(src, size, shape):
    # Icono para Android 7 (sin icono adaptable): 44 de 48 px, con margen como pide Material
    inner = round(size * 44 / 48)
    big = inner * SS
    mask = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(mask)
    if shape == 'circle':
        draw.ellipse((0, 0, big - 1, big - 1), fill=255)
    else:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=round(big * 0.2), fill=255)
    mask = mask.resize((inner, inner), Image.LANCZOS)
    icon = src.resize((inner, inner), Image.LANCZOS)
    icon.putalpha(mask)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    offset = (size - inner) // 2
    canvas.alpha_composite(icon, (offset, offset))
    return canvas

icon_only = Image.open(cfg['iconOnly']).convert('RGBA')
foreground = Image.open(cfg['foreground']).convert('RGBA')
background = Image.open(cfg['background']).convert('RGB')

for name, factor in cfg['densities'].items():
    folder = os.path.join(cfg['res'], 'mipmap-' + name)
    os.makedirs(folder, exist_ok=True)
    legacy = round(48 * factor)
    layer = round(108 * factor)
    outputs = {
        'ic_launcher.png': masked(icon_only, legacy, 'rounded'),
        'ic_launcher_round.png': masked(icon_only, legacy, 'circle'),
        'ic_launcher_foreground.png': foreground.resize((layer, layer), Image.LANCZOS),
        'ic_launcher_background.png': background.resize((layer, layer), Image.LANCZOS),
    }
    for filename, image in outputs.items():
        image.save(os.path.join(folder, filename), optimize=True)
    print(f"  mipmap-{name}: ic_launcher {legacy}px, capas adaptables {layer}px")
`;

const python = findPython();
const workDir = mkdtempSync(join(tmpdir(), 'stickerapp-icons-'));
try {
  const configFile = join(workDir, 'config.json');
  const scriptFile = join(workDir, 'icons.py');
  writeFileSync(configFile, JSON.stringify({ ...sources, res: RES_DIR, densities: DENSITIES }));
  writeFileSync(scriptFile, ICONS_PY);
  const result = spawnSync(python, [scriptFile, configFile], { stdio: 'inherit' });
  if (result.status !== 0) fail('Falló la generación de iconos con Pillow.');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

const anydpiDir = join(RES_DIR, 'mipmap-anydpi-v26');
writeFileSync(join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
writeFileSync(join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
writeFileSync(join(RES_DIR, 'values', 'ic_launcher_background.xml'), BACKGROUND_COLOR_XML);

for (const leftover of LEFTOVERS) {
  const path = join(RES_DIR, leftover);
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    console.log(`  borrado ${leftover}`);
  }
  const folder = dirname(path);
  if (folder !== RES_DIR && existsSync(folder) && readdirSync(folder).length === 0) rmSync(folder, { recursive: true });
}

console.log('[android-icons] Listo.');
