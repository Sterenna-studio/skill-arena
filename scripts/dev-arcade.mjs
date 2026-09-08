/**
 * dev-arcade.mjs — harnais de dev local pour Star Arcade.
 *
 * `public/arcade-casino/` n'est jouable que servi depuis la racine de
 * nitro.sterenna.fr : il y charge `/css/*.css`, `/shared/images/**` et surtout
 * `/shared/guards.js`, qui exige une vraie session Supabase. En dehors de
 * cette racine la page affiche « Star Arcade indisponible » et rien n'est
 * testable.
 *
 * Ce serveur rejoue la topologie de prod en local :
 *
 *   /arena/...          →  <repo>/public/
 *   /...                →  gwen-ha-star-static/   (css, images, /star/, ...)
 *   /shared/guards.js   →  stub de session invitée (ci-dessous)
 *
 * Le stub ne vit QUE dans ce script : rien dans `public/` ne change, donc
 * aucun chemin d'authentification n'est modifié en production.
 *
 *   node scripts/dev-arcade.mjs          → http://127.0.0.1:4173/arena/arcade-casino/
 *   PORT=5000 STAR_ROOT=../autre node scripts/dev-arcade.mjs
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC_ROOT = join(REPO, 'public');
const STAR_ROOT = resolve(REPO, process.env.STAR_ROOT ?? '../gwen-ha-star-static');
const PORT = Number(process.env.PORT ?? 4173);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// Session invitée locale. Même forme de retour que le vrai `requireAuth`
// (gwen-ha-star-static/shared/guards.js) pour que le core n'ait rien à savoir.
const GUARDS_STUB = `// STUB DE DEV — servi par scripts/dev-arcade.mjs, jamais déployé.
const DEV_USER = {
  id: 'local-dev',
  email: 'local@dev.invalid',
  user_metadata: { pseudo: 'PILOTE LOCAL' },
};

function banner() {
  if (document.getElementById('dev-arcade-banner')) return;
  const node = document.createElement('div');
  node.id = 'dev-arcade-banner';
  node.textContent = 'MODE DEV LOCAL · SESSION INVITÉE, AUCUNE AUTH RÉELLE';
  node.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
    'padding:4px 10px', 'background:#ff3d7f', 'color:#fff',
    'font:700 10px/1.6 ui-monospace,monospace', 'letter-spacing:.16em',
    'text-align:center', 'pointer-events:none',
  ].join(';');
  document.body.appendChild(node);
}

export async function requireAuth() {
  console.warn('[dev-arcade] /shared/guards.js est un stub local : session invitée, pas de Supabase.');
  if (document.body) banner();
  else document.addEventListener('DOMContentLoaded', banner);
  return { session: { user: DEV_USER }, user: DEV_USER, profile: {}, meta: { pseudo: 'PILOTE LOCAL' } };
}

export async function requireGuest() {
  return true;
}
`;

/** Résout une URL vers un fichier, sans laisser sortir de la racine montée. */
async function resolveFile(root, relative) {
  const target = resolve(join(root, relative));
  if (target !== root && !target.startsWith(root + sep)) return null;

  try {
    const info = await stat(target);
    if (!info.isDirectory()) return target;
  } catch {
    return null;
  }

  const index = join(target, 'index.html');
  try {
    await stat(index);
    return index;
  } catch {
    return null;
  }
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
  } catch {
    return send(res, 400, '400 — URL invalide');
  }

  if (pathname === '/shared/guards.js') {
    return send(res, 200, GUARDS_STUB, MIME['.js']);
  }

  if (pathname === '/') pathname = '/index.html';

  const mounts = pathname.startsWith('/arena/')
    ? [[PUBLIC_ROOT, pathname.slice('/arena'.length)], [STAR_ROOT, pathname]]
    : [[STAR_ROOT, pathname], [PUBLIC_ROOT, pathname]];

  for (const [root, relative] of mounts) {
    const file = await resolveFile(root, relative);
    if (!file) continue;
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    return createReadStream(file).pipe(res);
  }

  send(res, 404, `404 — ${pathname}\n\nMonté :\n  /arena/ → ${PUBLIC_ROOT}\n  /       → ${STAR_ROOT}`);
});

let starRootOk = true;
try {
  starRootOk = (await stat(STAR_ROOT)).isDirectory();
} catch {
  starRootOk = false;
}

server.listen(PORT, HOST, () => {
  console.log(`\n  Star Arcade — harnais local`);
  console.log(`  → http://${HOST}:${PORT}/arena/arcade-casino/\n`);
  console.log(`  /arena/ → ${PUBLIC_ROOT}`);
  console.log(`  /       → ${STAR_ROOT}${starRootOk ? '' : '   ⚠ INTROUVABLE'}`);
  if (!starRootOk) {
    console.log(`\n  ⚠ Sans gwen-ha-star-static, l'arcade se lance mais sans thème ni sprites.`);
    console.log(`    Clone-le à côté du repo, ou passe STAR_ROOT=<chemin>.`);
  }
  console.log(`  /shared/guards.js → stub de session invitée (dev uniquement)\n`);
});
