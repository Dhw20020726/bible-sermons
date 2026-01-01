#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');
const removeMd = require('remove-markdown');
const {hydrateAlgoliaEnv, resolveAlgoliaEnv} = require('./utils/env');

hydrateAlgoliaEnv();

const siteConfig = require('../docusaurus.config');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUTPUT_DIR = path.join(ROOT, 'build');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'algolia-index.json');
const MAX_CHUNK_LENGTH = 8000; // 单块内容长度上限，防止超出 Algolia 单记录限制

const docsRouteBasePath = (() => {
  const presets = siteConfig.presets || [];
  const classicPreset = presets.find((preset) => Array.isArray(preset) && preset[0] === 'classic');
  return classicPreset?.[1]?.docs?.routeBasePath?.replace(/^\//, '') || 'docs';
})();

function joinUrl(...parts) {
  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/$/, '');
      }
      return part.replace(/^\/+/, '').replace(/\/$/, '');
    })
    .join('/') + '/';
}

function normalizeSlug(rawSlug, relativePath) {
  const slug = rawSlug || relativePath;
  return slug.replace(/index$/i, '').replace(/\.mdx?$/, '').replace(/\/+$/, '').replace(/^\//, '');
}

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractTitle(content, frontmatterTitle, fallback) {
  if (frontmatterTitle) {
    return frontmatterTitle;
  }
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return fallback;
}

function chunkPlainText(lines) {
  const rawContent = lines.join('\n');
  const plain = removeMd(rawContent).replace(/\s+/g, ' ').trim();
  const truncated = plain.slice(0, MAX_CHUNK_LENGTH);
  return {plain, truncated, summary: truncated.slice(0, 500)};
}

function splitIntoChunks(parsed, options) {
  const {slug, relativePath, docTitle, url} = options;
  const lines = parsed.content.split(/\r?\n/);
  const headingRegex = /^(#{1,3})\s+(.+)$/;
  const hierarchy = {1: null, 2: null, 3: null};
  const anchorByLevel = {1: null, 2: null, 3: null};

  const records = [];
  let chunkLines = [];
  let chunkAnchor = null;
  let chunkTitle = docTitle;
  let chunkParent = url;
  let chunkIndex = 0;

  const pushChunk = () => {
    const {plain, truncated, summary} = chunkPlainText(chunkLines);
    if (!plain) {
      chunkLines = [];
      return;
    }
    records.push({
      objectID: `${slug || relativePath}#${chunkIndex}`,
      title: chunkTitle,
      url: chunkAnchor ? `${url}#${chunkAnchor}` : url,
      summary,
      content: truncated,
      hierarchy: {
        lvl0: docTitle,
        lvl1: hierarchy[1],
        lvl2: hierarchy[2],
        lvl3: hierarchy[3],
      },
      parent: chunkParent,
      tags: parsed.data.tags || [],
      category: parsed.data.sidebar_label || parsed.data.category || undefined,
      source: relativePath,
      headings: [hierarchy[1], hierarchy[2], hierarchy[3]].filter(Boolean),
    });
    chunkLines = [];
    chunkIndex += 1;
  };

  lines.forEach((line) => {
    const match = line.match(headingRegex);
    if (match) {
      pushChunk();

      const level = match[1].length;
      const headingText = match[2].trim();
      const anchor = slugify(headingText);

      hierarchy[level] = headingText;
      anchorByLevel[level] = anchor;
      if (level < 3) {
        hierarchy[level + 1] = null;
        anchorByLevel[level + 1] = null;
      }
      if (level < 2) {
        hierarchy[level + 2] = null;
        anchorByLevel[level + 2] = null;
      }

      let parentAnchor = null;
      if (level === 2) {
        parentAnchor = anchorByLevel[1];
      } else if (level === 3) {
        parentAnchor = anchorByLevel[2] || anchorByLevel[1];
      }

      chunkAnchor = anchor;
      chunkTitle = headingText;
      chunkParent = parentAnchor ? `${url}#${parentAnchor}` : url;
      chunkLines = [];
      return;
    }

    if (!line.trim() && chunkLines.length > 0) {
      chunkLines.push(line);
      pushChunk();
      return;
    }

    chunkLines.push(line);
  });

  pushChunk();
  return records;
}

function buildDocRecords(filePath) {
  const relativePath = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const slug = normalizeSlug(parsed.data.slug, relativePath.replace(/\/index\.mdx?$/, '/').replace(/\.mdx?$/, ''));
  const docTitle = extractTitle(parsed.content, parsed.data.title, path.parse(relativePath).name);
  const url = joinUrl(siteConfig.url, siteConfig.baseUrl, docsRouteBasePath, slug);

  return splitIntoChunks(parsed, {slug, relativePath, docTitle, url});
}

function generateIndex() {
  if (!fs.existsSync(DOCS_DIR)) {
    throw new Error('docs 目录不存在，无法生成 Algolia 索引');
  }

  const docFiles = fg.sync('**/*.{md,mdx}', {cwd: DOCS_DIR, absolute: true});
  const records = docFiles.flatMap((filePath) => buildDocRecords(filePath));

  fs.mkdirSync(OUTPUT_DIR, {recursive: true});
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2), 'utf8');

  const {indexName} = resolveAlgoliaEnv();
  console.log(`已生成 ${records.length} 条记录至 ${OUTPUT_FILE}，索引名：${indexName}`);
}

try {
  generateIndex();
} catch (error) {
  console.error('生成 Algolia 索引失败：', error.message);
  process.exit(1);
}
