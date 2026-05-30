// Injecte des balises anti-cache dans dist/index.html après le build web.
// Raison : sur GitHub Pages, l'index.html peut rester en cache et servir un
// ancien bundle JS -> bugs "fantômes" tant qu'on ne vide pas le cache.
// Les bundles JS (noms hashés) restent cacheables ; seul l'index est revalidé.
const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(f)) {
  console.error('dist/index.html introuvable — lance d’abord expo export.');
  process.exit(1);
}

let html = fs.readFileSync(f, 'utf8');
const meta =
  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">' +
  '<meta http-equiv="Pragma" content="no-cache">' +
  '<meta http-equiv="Expires" content="0">';

if (!html.includes('no-store, must-revalidate')) {
  html = html.replace('<head>', '<head>' + meta);
  fs.writeFileSync(f, html);
  console.log('index.html : balises anti-cache injectées.');
} else {
  console.log('index.html : balises anti-cache déjà présentes.');
}
