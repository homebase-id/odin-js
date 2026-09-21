// Folds dist-card's script, stylesheet and card fonts into card.html, so the apps ship a single file
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const dir = 'dist-card';
const read = (path) => readFileSync(`${dir}/${path}`, 'utf8');
const font = (_, name) =>
  `url(data:font/woff2;base64,${readFileSync(`public/fonts/${name}`).toString('base64')})`;

const html = read('card.html')
  .replace(
    /<script type="module" crossorigin src="\/([^"]+)"><\/script>/,
    (_, src) => `<script type="module">${read(src).replace(/<\/script/gi, '<\\/script')}</script>`
  )
  .replace(
    /<link rel="stylesheet" crossorigin href="\/([^"]+)">/,
    (_, href) => `<style>${read(href).replace(/url\(["']?\/fonts\/([^"')]+)["']?\)/g, font)}</style>`
  );
if (/<script[^>]+src=|<link[^>]+href=|url\(["']?\//.test(html)) throw new Error('card.html still loads files');

writeFileSync(`${dir}/card.html`, html);
rmSync(`${dir}/assets`, { recursive: true, force: true });
