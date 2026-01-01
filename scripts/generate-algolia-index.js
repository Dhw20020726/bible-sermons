#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { resolveAlgoliaConfig } = require('./utils/env');

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const OUTPUT_PATH = path.join(ROOT_DIR, 'build', 'algolia', 'index.json');
const ROUTE_BASE_PATH = '/docs';

function collectDocFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...collectDocFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) {
    return { frontMatter: {}, body: raw };
  }

  const endIndex = raw.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { frontMatter: {}, body: raw };
  }

  const frontMatterSource = raw.slice(3, endIndex).trim();
  const body = raw.slice(endIndex + 4);
  const frontMatter = {};

  for (const line of frontMatterSource.split(/\r?\n/)) {
    const delimiterIndex = line.indexOf(':');
    if (delimiterIndex === -1) continue;

    const key = line.slice(0, delimiterIndex).trim();
    const rawValue = line.slice(delimiterIndex + 1).trim();
    if (!key) continue;

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      frontMatter[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (/^(true|false)$/i.test(rawValue)) {
      frontMatter[key] = rawValue.toLowerCase() === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      frontMatter[key] = Number(rawValue);
    } else {
      frontMatter[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }

  return { frontMatter, body };
}

function extractHeadings(markdown) {
  const headings = [];
  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const title = match[2].trim();
    if (title) headings.push(title);
  }
  return headings;
}

function extractTitle(frontMatter, headings, fallback) {
  if (frontMatter.title) return String(frontMatter.title);
  if (headings.length > 0) return headings[0];
  return fallback;
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`>#-]/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(filePath, frontmatterSlug) {
  if (frontmatterSlug) {
    return normalizeSlug(frontmatterSlug);
  }

  const relative = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const withoutExt = relative.replace(/(index)?\.(md|mdx)$/i, '');
  const base = withoutExt ? `${ROUTE_BASE_PATH}/${withoutExt}` : ROUTE_BASE_PATH;
  return normalizeSlug(base);
}

function normalizeSlug(slug) {
  let result = slug.trim();
  if (!result.startsWith('/')) {
    result = `/${result}`;
  }
  result = result.replace(/\/+/g, '/');
  if (result.length > 1 && result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result || ROUTE_BASE_PATH;
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => String(tag));
  if (typeof tags === 'string') return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function buildRecord(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { frontMatter, body } = parseFrontMatter(content);
  const headings = extractHeadings(body);
  const slug = toSlug(filePath, frontMatter.slug);
  const title = extractTitle(frontMatter, headings, slug);
  const tags = normalizeTags(frontMatter.tags);
  const description = frontMatter.description || frontMatter.summary || '';
  const plainText = stripMarkdown(body);
  const stats = fs.statSync(filePath);

  return {
    objectID: slug,
    slug,
    title,
    headings,
    tags,
    description,
    content: plainText,
    updatedAt: stats.mtime.toISOString(),
    source: path.relative(ROOT_DIR, filePath),
  };
}

function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Docs directory not found at ${DOCS_DIR}`);
    process.exit(1);
  }

  // Ensure env values are loaded for downstream steps (e.g., index name in the uploader).
  resolveAlgoliaConfig();

  const files = collectDocFiles(DOCS_DIR);
  const records = files.map(buildRecord);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2), 'utf8');

  console.log(`Generated ${records.length} Algolia records at ${OUTPUT_PATH}`);
}

main();
