// Post-build : défait le cache agressif de GitHub Pages.
// 1) balises anti-cache dans index.html (best effort)
// 2) un service worker "réseau d'abord" qui contourne le cache HTTP -> l'app
//    se met à jour sans avoir à vider le cache manuellement.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html introuvable — lance d’abord expo export.');
  process.exit(1);
}

// Domaine custom servi à la racine. Le préfixe est dérivé de app.json
// (baseUrl) : "" à la racine (iasser.com), "/myprotos" en sous-chemin.
const DOMAINE = 'iasser.com';
const baseUrl = (require('../app.json').expo.experiments || {}).baseUrl || '/';
const base = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');

// --- 1) Service worker : navigations + bundles JS toujours pris du réseau ---
const sw = `// Service worker iasser — anti-cache (réseau d'abord).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  const estNav = req.mode === 'navigate';
  const estBundle = url.pathname.indexOf('/_expo/') !== -1;
  if (estNav || estBundle) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function () { return fetch(req); })
    );
  }
});
`;
fs.writeFileSync(path.join(dist, 'sw.js'), sw);

// --- 2) index.html : meta anti-cache + enregistrement du service worker -----
let html = fs.readFileSync(indexPath, 'utf8');
const meta =
  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">' +
  '<meta http-equiv="Pragma" content="no-cache">' +
  '<meta http-equiv="Expires" content="0">' +
  // Fond global sombre : évite le blanc dans la zone d'overscroll (bas de page)
  // et synchronise la barre du navigateur mobile avec le thème.
  '<meta name="theme-color" content="#0F0F12">' +
  '<style>html,body,#root{background-color:#0F0F12;}body{overscroll-behavior:none;}</style>';
const reg =
  "<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){" +
  `navigator.serviceWorker.register('${base}/sw.js',{scope:'${base}/'}).catch(function(){});});}</script>`;

if (!html.includes('no-store, must-revalidate')) {
  html = html.replace('<head>', '<head>' + meta);
}
if (!html.includes(`serviceWorker.register('${base}/sw.js'`)) {
  html = html.replace('</head>', reg + '</head>');
}
fs.writeFileSync(indexPath, html);

// --- 3) Fallback SPA : 404.html = copie d'index.html (liens profonds) -------
fs.writeFileSync(path.join(dist, '404.html'), html);

// --- 4) Domaine custom GitHub Pages : fichier CNAME -------------------------
fs.writeFileSync(path.join(dist, 'CNAME'), DOMAINE + '\n');

console.log(`index.html : anti-cache + SW (base="${base || '/'}") ; sw.js, 404.html, CNAME(${DOMAINE}) écrits.`);
