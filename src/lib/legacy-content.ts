import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import hljs from 'highlight.js';
import { marked, Renderer } from 'marked';

export const SITE_URL = 'https://mylesborins.com';

type LegacyType = '404' | 'about' | 'blog' | 'project' | 'talks';

type LegacyHeader = {
  title: string;
  date?: string;
  description?: string;
  type: LegacyType;
  quarter?: string;
  project?: string;
  bigImage?: string;
  bigImageAlt?: string;
};

export interface LegacyEntry extends LegacyHeader {
  slug: string;
  url: string;
  canonicalUrl: string;
  sourcePath: string;
  dateValue: Date | null;
  displayDate: string | null;
  contentMarkdown: string;
  contentHtml: string;
}

export interface BlogPage {
  index: number;
  url: string;
  post: LegacyEntry;
}

const CONTENT_ROOT = 'content';
const renderer = new Renderer();
const numbers = ['oops', 'one', 'two', 'three', 'four', 'five', 'six'];

renderer.image = function ({ href, title, text }) {
  const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
  return `<img src="${href}" alt="${escapeHtml(text)}"${titleAttribute}>`;
};

renderer.heading = function ({ depth, tokens }) {
  const text = this.parser.parseInline(tokens);
  if (depth === 1) {
    return `<hr class="top-top-one"><hr class="top-one"><h1>${text}</h1><hr class="bottom-one"><hr class="bottom-bottom-one">`;
  }
  return `<hr class="top-${numbers[depth]}"><h${depth}>${text}</h${depth}><hr class="bottom-${numbers[depth]}">`;
};

renderer.code = function ({ lang, text }) {
  const normalizedLang = lang?.trim();
  const className = normalizedLang ? ` class="hljs language-${escapeHtml(normalizedLang)}"` : ' class="hljs"';

  if (normalizedLang && hljs.getLanguage(normalizedLang)) {
    const highlighted = hljs.highlight(text, { language: normalizedLang, ignoreIllegals: true }).value;
    return `<pre><code${className}>${highlighted}</code></pre>`;
  }

  if (!normalizedLang) {
    const highlighted = hljs.highlightAuto(text).value;
    return `<pre><code${className}>${highlighted}</code></pre>`;
  }

  return `<pre><code${className}>${escapeHtml(text)}</code></pre>`;
};

let cachedEntries: LegacyEntry[] | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat('en-US').format(date) : null;
}

export function slugifyLegacy(value: string) {
  return value
    .toLowerCase()
    .replaceAll('&', ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLegacyFile(filePath: string): LegacyEntry {
  const raw = readFileSync(filePath, 'utf8');
  const match = raw.match(/^\s*({[\s\S]*?^})\s*/m);
  if (!match) throw new Error(`Missing legacy header in ${filePath}`);
  const header = vm.runInNewContext(`(${match[1]})`) as LegacyHeader;
  const contentMarkdown = raw.slice(match[0].length).trim();
  const slug = slugifyLegacy(header.title);
  const url = `/${header.type}/${slug}/`;
  const canonicalUrl =
    header.type === 'about'
      ? `${SITE_URL}/about/`
      : header.type === 'talks'
        ? `${SITE_URL}/talks/`
        : header.type === '404'
          ? `${SITE_URL}/404.html`
          : `${SITE_URL}${url}`;
  const dateValue = parseDate(header.date);

  return {
    ...header,
    slug,
    url,
    canonicalUrl,
    sourcePath: filePath,
    dateValue,
    displayDate: formatDate(dateValue),
    contentMarkdown,
    contentHtml: marked.parse(contentMarkdown, { renderer, gfm: true }) as string
  };
}

function loadEntries() {
  if (cachedEntries) return cachedEntries;
  const folders = ['posts', 'projects', 'pages'];
  cachedEntries = folders
    .flatMap((folder) =>
      readdirSync(join(CONTENT_ROOT, folder))
        .filter((fileName) => fileName.endsWith('.md') && !fileName.startsWith('_'))
        .map((fileName) => parseLegacyFile(join(CONTENT_ROOT, folder, fileName)))
    )
    .sort((left, right) => {
      const leftTime = left.dateValue?.getTime() ?? Number.NEGATIVE_INFINITY;
      const rightTime = right.dateValue?.getTime() ?? Number.NEGATIVE_INFINITY;
      return rightTime - leftTime || left.title.localeCompare(right.title);
    });
  return cachedEntries;
}

export function getBlogPosts() {
  return loadEntries().filter((entry) => entry.type === 'blog');
}

export function getProjectPosts() {
  return loadEntries().filter((entry) => entry.type === 'project');
}

export function getSingletonPage(type: Extract<LegacyType, '404' | 'about' | 'talks'>) {
  return loadEntries().find((entry) => entry.type === type) ?? null;
}

export function getBlogPages(): BlogPage[] {
  return getBlogPosts().map((post, index) => ({
    index,
    url: index === 0 ? '/' : `/page/${index}/`,
    post
  }));
}