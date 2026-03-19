import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOT = 'src';
const TARGET_ROOT = 'astro-public';
const COPY_PATHS = [
  'CNAME',
  '.well-known',
  'examples',
  'files',
  'images',
  'scripts'
];

rmSync(TARGET_ROOT, { recursive: true, force: true });
mkdirSync(TARGET_ROOT, { recursive: true });

for (const relativePath of COPY_PATHS) {
  const sourcePath = join(SOURCE_ROOT, relativePath);
  const targetPath = join(TARGET_ROOT, relativePath);

  if (!existsSync(sourcePath)) {
    continue;
  }

  cpSync(sourcePath, targetPath, { recursive: true });
}