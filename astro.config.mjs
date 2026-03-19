import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mylesborins.com',
  srcDir: './astro-src',
  publicDir: './astro-public',
  outDir: './dist-astro',
  trailingSlash: 'always'
});