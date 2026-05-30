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

// --- 1) Service worker : navigations + bundles JS toujours pris du réseau ---
const sw = `// Service worker GetExp — anti-cache (réseau d'abord).
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
  '<meta http-equiv="Expires" content="0">';
const reg =
  "<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){" +
  "navigator.serviceWorker.register('/myprotos/sw.js',{scope:'/myprotos/'}).catch(function(){});});}</script>";

if (!html.includes('no-store, must-revalidate')) {
  html = html.replace('<head>', '<head>' + meta);
}
if (!html.includes("serviceWorker.register('/myprotos/sw.js'")) {
  html = html.replace('</head>', reg + '</head>');
}
fs.writeFileSync(indexPath, html);
console.log('index.html : anti-cache + service worker injectés ; sw.js écrit.');
