#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');
const removeMd = require('remove-markdown');
const algoliasearch = require('algoliasearch');
const {buildBookIndex, loadChapterLines} = require('../plugins/bible-embed');
const {hydrateAlgoliaEnv, resolveAlgoliaEnv} = require('./utils/env');
const {createSectionSlugger, resolveHeadingAnchor} = require('./utils/slug');

hydrateAlgoliaEnv();

const siteConfig = require('../docusaurus.config');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const BIBLE_BASE_DIR = path.join(ROOT, 'static', 'bible');
const OUTPUT_DIR = path.join(ROOT, 'build');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'algolia-index.json');
const MAX_CHUNK_LENGTH = 8000; // 单块内容长度上限，防止超出 Algolia 单记录限制
const DEFAULT_LANGUAGE = siteConfig.i18n?.defaultLocale || 'en';
const DEFAULT_DOCUSUARUS_TAGS = ['default', 'docs-default-current'];
const DEFAULT_BIBLE_VERSION = 'cmn-cu89s_readaloud';

const docsRouteBasePath = (() => {
  const presets = siteConfig.presets || [];
  const classicPreset = presets.find((preset) => Array.isArray(preset) && preset[0] === 'classic');
  return classicPreset?.[1]?.docs?.routeBasePath?.replace(/^\//, '') || 'docs';
})();

function joinUrl(...parts) {
  return (
    parts
      .filter(Boolean)
      .map((part, index) => {
        if (index === 0) {
          return part.replace(/\/$/, '');
        }
        return part.replace(/^\/+/, '').replace(/\/$/, '');
      })
      .join('/') + '/'
  );
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

function parseAttributes(raw) {
  const attrs = {};
  const regex = /(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*'([^']*)'/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(raw))) {
    const key = match[1] || match[3];
    const value = match[2] || match[4] || '';
    attrs[key] = value;
  }
  return attrs;
}

function normalizeBookName(name) {
  if (!name) return '';
  return String(name)
    .replace(/^\uFEFF/, '')
    .replace(/[．。.]*$/g, '')
    .trim();
}

function parseSegment(rawSegment, fallbackBook) {
  const segment = rawSegment.trim();
  if (!segment) return null;

  const bookMatch = segment.match(/^(?<book>[\u4e00-\u9fffA-Za-z0-9]+)\s+(?<rest>.+)$/);
  const book = bookMatch ? normalizeBookName(bookMatch.groups.book) : fallbackBook;
  const versePart = bookMatch ? bookMatch.groups.rest : segment;
  const match = versePart.match(/^(?<chapter>\d+)\s*:\s*(?<verses>.+)$/);
  if (!match || !book) return null;

  const chapter = Number.parseInt(match.groups.chapter, 10);
  const ranges = match.groups.verses
    .split(/[;,，；]/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const [startRaw, endRaw] = piece.split('-').map((p) => p && p.trim());
      const start = Number.parseInt(startRaw, 10);
      const end = endRaw ? Number.parseInt(endRaw, 10) : start;
      if (Number.isNaN(start) || Number.isNaN(end)) return null;
      return {start, end: Math.max(start, end)};
    })
    .filter(Boolean);

  if (Number.isNaN(chapter) || ranges.length === 0) return null;
  return {book, chapter, ranges};
}

function parsePassage(passage) {
  const trimmed = (passage || '').trim();
  if (!trimmed) {
    throw new Error('passage 不能为空');
  }
  const [bookPart, ...restParts] = trimmed.split(/\s+/);
  const fallbackBook = normalizeBookName(bookPart);
  const rest = restParts.join(' ');
  if (!fallbackBook || !rest) {
    throw new Error('passage 需要包含卷书名和节段，例如 “创世记 2:7-9”');
  }
  const segments = rest
    .split(/[;；]/)
    .map((segment) => parseSegment(segment, fallbackBook))
    .filter(Boolean);
  if (segments.length === 0) {
    throw new Error('未能解析有效的章节或节段');
  }
  return segments;
}

const bibleMappingCache = new Map();
const bibleChapterCache = new Map();

function getBibleMapping(version) {
  const key = `${BIBLE_BASE_DIR}::${version}`;
  if (bibleMappingCache.has(key)) {
    return bibleMappingCache.get(key);
  }
  const mapping = buildBookIndex(BIBLE_BASE_DIR, version);
  bibleMappingCache.set(key, mapping);
  return mapping;
}

function getChapterLines(version, book, chapter) {
  const cacheKey = `${version}::${book}::${chapter}`;
  if (bibleChapterCache.has(cacheKey)) {
    return bibleChapterCache.get(cacheKey);
  }
  const mapping = getBibleMapping(version);
  const lines = loadChapterLines(BIBLE_BASE_DIR, version, mapping, book, chapter);
  bibleChapterCache.set(cacheKey, lines);
  return lines;
}

function renderBiblePassageText(passage, version) {
  const segments = parsePassage(passage);
  const entries = [];

  for (const segment of segments) {
    const lines = getChapterLines(version, segment.book, segment.chapter);
    for (const range of segment.ranges) {
      for (let v = range.start; v <= range.end; v += 1) {
        const lineIndex = v + 1; // 0: 卷书名, 1: 章号, 2: 第1节
        const text = (lines[lineIndex] || '').trim();
        const verseText = text || `[${segment.book} ${segment.chapter}:${v} 未找到内容]`;
        entries.push({book: segment.book, chapter: segment.chapter, verse: v, text: verseText});
      }
    }
  }

  const bookCount = new Set(entries.map((item) => item.book)).size;
  const chapterCount = new Set(entries.map((item) => `${item.book}-${item.chapter}`)).size;
  const includeRef = entries.length > 1;
  const includeBook = includeRef && bookCount > 1;
  const includeChapter = includeRef && (includeBook || chapterCount > 1);

  const verseTexts = entries.map((item) => {
    if (!includeRef) {
      return item.text;
    }
    if (includeBook) {
      return `${item.book} ${item.chapter}:${item.verse} ${item.text}`;
    }
    if (includeChapter) {
      return `${item.chapter}:${item.verse} ${item.text}`;
    }
    return `${item.verse} ${item.text}`;
  });

  return verseTexts.join('\n');
}

function expandBiblePlaceholders(content) {
  if (!fs.existsSync(BIBLE_BASE_DIR)) {
    return content;
  }

  const pattern = /\{\{\s*bible\s+([^}]+)\s*\}\}|\[\[\s*bible\s+([^\]]+)\s*\]\]/gi;

  return content.replace(pattern, (fullMatch, group1, group2) => {
    const attrText = group1 || group2 || '';
    const attrs = parseAttributes(attrText);
    const passage = attrs.passage || attrs.ref;
    const version = attrs.version || DEFAULT_BIBLE_VERSION;

    if (!passage) {
      return fullMatch;
    }

    try {
      const verses = renderBiblePassageText(passage, version);
      return verses || fullMatch;
    } catch (error) {
      console.warn(`无法展开经文占位符（${passage}）：${error.message}`);
      return fullMatch;
    }
  });
}

function chunkPlainText(lines) {
  const rawContent = lines.join('\n');
  const plain = removeMd(rawContent).replace(/\s+/g, ' ').trim();
  const truncated = plain.slice(0, MAX_CHUNK_LENGTH);
  const summary = truncated.length > 500 ? truncated.slice(0, 500) : null;
  return {plain, truncated, summary};
}

function buildDocBreadcrumb(relativePath, docTitle) {
  const parts = relativePath.split('/');
  const testament = parts[0] === 'old-testament' ? '旧约' : parts[0] === 'new-testament' ? '新约' : parts[0];
  return [testament, docTitle].filter(Boolean).join(' > ');
}

function splitIntoChunks(parsed, options) {
  const {slug, relativePath, docTitle, url} = options;
  const docBreadcrumb = buildDocBreadcrumb(relativePath, docTitle);
  const lines = parsed.content.split(/\r?\n/);
  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const anchorByLevel = {1: null, 2: null, 3: null, 4: null, 5: null, 6: null};
  const slugger = createSectionSlugger();
  let currentSection = '';
  let activeSectionPath = docBreadcrumb;
  let activeHeadingTitle = null;

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
    const headingList = [currentSection || null, activeHeadingTitle].filter(Boolean);
    records.push({
      objectID: `${slug || relativePath}#${chunkIndex}`,
      title: chunkTitle,
      url: chunkAnchor ? `${url}#${chunkAnchor}` : url,
      url_without_anchor: url,
      anchor: chunkAnchor,
      type: 'content',
      summary,
      content: truncated || null,
      hierarchy: {
        lvl0: activeSectionPath,
        lvl1: activeHeadingTitle,
        lvl2: null,
        lvl3: null,
        lvl4: null,
        lvl5: null,
        lvl6: null,
      },
      hierarchy_camel: {
        lvl0: activeSectionPath,
        lvl1: activeHeadingTitle,
        lvl2: null,
        lvl3: null,
        lvl4: null,
        lvl5: null,
        lvl6: null,
      },
      parent: chunkParent,
      tags: parsed.data.tags || [],
      category: parsed.data.sidebar_label || parsed.data.category || undefined,
      source: relativePath,
      language: DEFAULT_LANGUAGE,
      docusaurus_tag: DEFAULT_DOCUSUARUS_TAGS,
      headings: headingList,
      doc_breadcrumb: activeSectionPath,
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
      activeSectionPath = currentSection ? `${docBreadcrumb} > ${currentSection}` : docBreadcrumb;
      activeHeadingTitle = headingText === currentSection ? null : headingText;
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
  const contentWithBibleText = expandBiblePlaceholders(parsed.content);
  const slug = normalizeSlug(parsed.data.slug, relativePath.replace(/\/index\.mdx?$/, '/').replace(/\.mdx?$/, ''));
  const docTitle = extractTitle(parsed.content, parsed.data.title, path.parse(relativePath).name);
  const url = joinUrl(siteConfig.url, siteConfig.baseUrl, docsRouteBasePath, slug);

  return splitIntoChunks({...parsed, content: contentWithBibleText}, {slug, relativePath, docTitle, url});
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

  return records;
}

function readIndexFile() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error('未找到 build/algolia-index.json，请先运行 npm run index:generate');
  }
  const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
  return JSON.parse(raw);
}

async function uploadIndex(recordsFromCaller) {
  const {appId, adminApiKey, indexName} = resolveAlgoliaEnv({requireAdmin: true, requireSearch: true});
  const records = recordsFromCaller || readIndexFile();

  const client = algoliasearch(appId, adminApiKey);
  const index = client.initIndex(indexName);

  console.log(`准备上传 ${records.length} 条记录到 Algolia 索引 ${indexName} ...`);

  await index.replaceAllObjects(records, {safe: true});
  await index.setSettings({
    searchableAttributes: [
      'hierarchy.lvl0',
      'hierarchy.lvl1',
      'hierarchy.lvl2',
      'hierarchy.lvl3',
      'hierarchy.lvl4',
      'hierarchy.lvl5',
      'hierarchy.lvl6',
      'title',
      'headings',
      'summary',
      'content',
    ],
    attributesToSnippet: ['summary:50', 'content:25'],
    attributesToHighlight: [
      'hierarchy.lvl0',
      'hierarchy.lvl1',
      'hierarchy.lvl2',
      'hierarchy.lvl3',
      'hierarchy.lvl4',
      'hierarchy.lvl5',
      'hierarchy.lvl6',
      'summary',
      'content',
    ],
    attributesForFaceting: ['filterOnly(tags)', 'filterOnly(category)', 'filterOnly(language)', 'filterOnly(docusaurus_tag)'],
  });

  console.log('索引上传完成');
}

async function main() {
  const action = (process.argv[2] || 'generate').toLowerCase();

  if (action === 'generate') {
    generateIndex();
    return;
  }

  if (action === 'upload') {
    await uploadIndex();
    return;
  }

  if (action === 'all' || action === 'generate-upload') {
    const records = generateIndex();
    await uploadIndex(records);
    return;
  }

  console.error('未知指令，请使用：generate | upload | all');
  process.exit(1);
}

main().catch((error) => {
  console.error('Algolia 索引任务失败：', error.message);
  process.exit(1);
});
