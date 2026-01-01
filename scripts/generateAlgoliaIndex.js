#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');
const removeMd = require('remove-markdown');
const {hydrateAlgoliaEnv, resolveAlgoliaEnv} = require('./utils/env');
const {createSectionSlugger, resolveHeadingAnchor} = require('./utils/slug');

hydrateAlgoliaEnv();

const siteConfig = require('../docusaurus.config');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUTPUT_DIR = path.join(ROOT, 'build');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'algolia-index.json');
const MAX_CHUNK_LENGTH = 8000; // 单块内容长度上限，防止超出 Algolia 单记录限制
const DEFAULT_LANGUAGE = siteConfig.i18n?.defaultLocale || 'en';
const DEFAULT_DOCUSUARUS_TAGS = ['default', 'docs-default-current'];

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

function buildDocBreadcrumb(relativePath, docTitle) {
  const parts = relativePath.split('/');
  const testament = parts[0] === 'old-testament' ? '旧约' : parts[0] === 'new-testament' ? '新约' : parts[0];
  const book = parts[1] || '';
  return [testament, book, docTitle].filter(Boolean).join(' > ');
}

function createHierarchyState(docBreadcrumb, docTitle) {
  const levels = {
    0: docBreadcrumb,
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };

  return {
    update(level, text) {
      levels[level] = text;
      for (let i = level + 1; i <= 6; i += 1) {
        levels[i] = null;
      }
    },
    getNormalized() {
      return {
        lvl0: levels[0] || docBreadcrumb,
        lvl1: levels[1] || docTitle,
        lvl2: levels[2],
        lvl3: levels[3],
        lvl4: levels[4],
        lvl5: levels[5],
        lvl6: levels[6],
      };
    },
    getHeadingList() {
      return [levels[1] || docTitle, levels[2], levels[3], levels[4], levels[5], levels[6]].filter(Boolean);
    },
  };
}

function splitIntoChunks(parsed, options) {
  const {slug, relativePath, docTitle, url} = options;
  const docBreadcrumb = buildDocBreadcrumb(relativePath, docTitle);
  const lines = parsed.content.split(/\r?\n/);
  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const hierarchyState = createHierarchyState(docBreadcrumb, docTitle);
  const anchorByLevel = {1: null, 2: null, 3: null, 4: null, 5: null, 6: null};
  const slugger = createSectionSlugger();
  let currentSection = '';

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
    const normalizedHierarchy = hierarchyState.getNormalized();
    records.push({
      objectID: `${slug || relativePath}#${chunkIndex}`,
      title: chunkTitle,
      url: chunkAnchor ? `${url}#${chunkAnchor}` : url,
      url_without_anchor: url,
      anchor: chunkAnchor,
      type: 'content',
      summary,
      content: truncated || null,
      hierarchy: normalizedHierarchy,
      hierarchy_camel: normalizedHierarchy,
      parent: chunkParent,
      tags: parsed.data.tags || [],
      category: parsed.data.sidebar_label || parsed.data.category || undefined,
      source: relativePath,
      language: DEFAULT_LANGUAGE,
      docusaurus_tag: DEFAULT_DOCUSUARUS_TAGS,
      headings: hierarchyState.getHeadingList(),
      doc_breadcrumb: docBreadcrumb,
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
      const {anchor, sectionLabel} = resolveHeadingAnchor({
        level,
        text: headingText,
        currentSection,
        slugger,
      });

      hierarchyState.update(level, headingText);
      anchorByLevel[level] = anchor;
      if (level === 2) {
        currentSection = sectionLabel;
      } else if (level < 2) {
        currentSection = '';
      }
      for (let i = level + 1; i <= 6; i += 1) {
        anchorByLevel[i] = null;
      }

      let parentAnchor = null;
      for (let i = level - 1; i >= 1; i -= 1) {
        if (anchorByLevel[i]) {
          parentAnchor = anchorByLevel[i];
          break;
        }
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
