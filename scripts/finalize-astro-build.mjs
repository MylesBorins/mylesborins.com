import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SITE_ROOT = 'dist-astro';
const SITE_URL = 'https://mylesborins.com';
const SITEMAP_EXCLUDES = new Set([
  '/404.html'
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function toPublicUrl(filePath) {
  const relativePath = relative(SITE_ROOT, filePath).replace(/\\/g, '/');
  if (relativePath === 'index.html') return '/';
  if (relativePath.endsWith('/index.html')) return `/${relativePath.slice(0, -'index.html'.length)}`;
  return `/${relativePath}`;
}

function flattenHtmlDirectoryRoutes(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);

    if (!entry.isDirectory()) continue;

    flattenHtmlDirectoryRoutes(entryPath);

    if (!entry.name.endsWith('.html')) continue;

    const childEntries = readdirSync(entryPath, { withFileTypes: true });
    if (childEntries.length !== 1 || !childEntries[0].isFile() || childEntries[0].name !== 'index.html') continue;

    const targetPath = entryPath;
    const html = readFileSync(join(entryPath, 'index.html'));
    rmSync(entryPath, { recursive: true, force: true });
    writeFileSync(targetPath, html);
  }
}

function generateSeoFiles() {
  const htmlFiles = walk(SITE_ROOT).filter((filePath) => filePath.endsWith('.html'));
  const urls = htmlFiles
    .map((filePath) => ({ filePath, url: toPublicUrl(filePath) }))
    .filter(({ url }) => !SITEMAP_EXCLUDES.has(url))
    .sort((a, b) => a.url.localeCompare(b.url));

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ filePath, url }) => [
      '  <url>',
      `    <loc>${SITE_URL}${url}</loc>`,
      `    <lastmod>${statSync(filePath).mtime.toISOString()}</lastmod>`,
      '  </url>'
    ].join('\n')),
    '</urlset>'
  ].join('\n');

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`
  ].join('\n');

  mkdirSync(SITE_ROOT, { recursive: true });
  writeFileSync(join(SITE_ROOT, 'sitemap.xml'), `${sitemap}\n`);
  writeFileSync(join(SITE_ROOT, 'robots.txt'), `${robots}\n`);
}

flattenHtmlDirectoryRoutes(SITE_ROOT);
generateSeoFiles();