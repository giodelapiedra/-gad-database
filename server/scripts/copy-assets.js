/**
 * `tsc` only emits JavaScript, so the `.xlsx` form templates in src/templates
 * would be missing from a production build. Mirror them into dist/ after compile.
 */
const fs = require('fs');
const path = require('path');

const pairs = [
  [path.join(__dirname, '..', 'src', 'templates'), path.join(__dirname, '..', 'dist', 'templates')],
];

let copied = 0;

for (const [src, dest] of pairs) {
  if (!fs.existsSync(src)) {
    console.warn(`copy-assets: skipping missing ${src}`);
    continue;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
    copied++;
  }
}

console.log(`copy-assets: copied ${copied} file(s)`);
