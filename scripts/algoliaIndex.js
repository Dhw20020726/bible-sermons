#!/usr/bin/env node
/**
 * @fileoverview Algolia 搜索索引生成与上传脚本。
 *
 * 运行方式：npm run index:generate | index:upload | index:all
 *
 * 核心流程：
 *   1. 扫描 docs/ 下所有 .md 文件
 *   2. 解析 frontmatter 和正文
 *   3. 展开 [[bible ...]] 占位符为纯文本经文（Algolia 不支持 HTML AST）
 *   4. 按标题将文档切分为 chunks
 *   5. 生成/上传到 Algolia 索引
 *
 * 与 bible-embed 插件共享 parsePassage/parseAttributes（来自 lib/bible-parser.js），
 * 但经文渲染走自己的纯文本路径 renderBiblePassageText()（插件渲染的是 remark AST）。
 */

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');
const removeMd = require('remove-markdown');
const algoliasearch = require('algoliasearch');
const {buildBookIndex, loadChapterLines} = require('../plugins/bible-embed');
const {parseAttributes, parsePassage} = require('../lib/bible-parser');
const {hydrateAlgoliaEnv, resolveAlgoliaEnv} = require('./utils/env');
const {createSectionSlugger, resolveHeadingAnchor} = require('../lib/slug');

hydrateAlgoliaEnv();

const siteConfig = require('../docusaurus.config');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const BIBLE_BASE_DIR = path.join(ROOT, 'static', 'bible');
const OUTPUT_DIR = path.join(ROOT, 'build');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'algolia-index.json');
const MAX_CHUNK_LENGTH = 8000; // 单块内容长度上限，防止超出 Algolia 单记录限制
const SUMMARY_LENGTH = 500;    // Algolia 搜索摘要截取长度
const DEFAULT_LANGUAGE = siteConfig.i18n?.defaultLocale || 'en';
const DEFAULT_DOCUSUARUS_TAGS = ['default', 'docs-default-current'];
const DEFAULT_BIBLE_VERSION = 'cmn-cu89s_readaloud';

const docsRouteBasePath = (() => {
  const presets = siteConfig.presets || [];
  const classicPreset = presets.find((preset) => Array.isArray(preset) && preset[0] === 'classic');
  return classicPreset?.[1]?.docs?.routeBasePath?.replace(/^\//, '') || 'docs';
})();

/** 拼接 URL 路径段，智能处理首尾斜杠 */
function joinUrl(...parts) {
  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/$/, '');
      }
      return part.replace(/^\/+/, '').replace(/\/$/, '');
    })
    .join('/');
}

/** 规范化 Docusaurus slug：去掉 /index 后缀、去掉扩展名、去掉首尾斜杠 */
function normalizeSlug(rawSlug, relativePath) {
  const slug = rawSlug || relativePath;
  return slug.replace(/index$/i, '').replace(/\.mdx?$/, '').replace(/\/+$/, '').replace(/^\//, '');
}

/** 提取文档标题：优先 frontmatter title → 正文第一个 H1 → 文件名 fallback */
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

const bibleMappingCache = new Map();
const bibleChapterCache = new Map();

/** 带缓存的圣经书卷索引获取，复用 bible-embed 的 buildBookIndex 并缓存结果 */
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

/**
 * 将圣经经文引用渲染为纯文本（区别于插件的 remark AST 渲染）。
 * 包含智能引用前缀：多卷书时加书名，多章时加章号。
 */
function renderBiblePassageText(passage, version) {
  const segments = parsePassage(passage);
  const entries = [];

  for (const segment of segments) {
    const lines = getChapterLines(version, segment.book, segment.chapter);
    for (const range of segment.ranges) {
      for (let v = range.start; v <= range.end; v += 1) {
        // 经文文件行布局：[0]书名 [1]章号 [2]第1节 → 节号+1=行索引，跳过文件头2行
        const VERSE_HEADER_LINES = 2;
        const lineIndex = v + VERSE_HEADER_LINES;
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

/** 将 Markdown 中的 [[bible ...]] 占位符替换为纯文本经文，供 Algolia 索引使用 */
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
  const summary = truncated.length > SUMMARY_LENGTH ? truncated.slice(0, SUMMARY_LENGTH) : null;
  return {plain, truncated, summary};
}

/** 根据文档路径构建 breadcrumb（旧约/新约 > 文档标题） */
function buildDocBreadcrumb(relativePath, docTitle) {
  const parts = relativePath.split('/');
  const testament = parts[0] === 'old-testament' ? '旧约' : parts[0] === 'new-testament' ? '新约' : parts[0];
  return [testament, docTitle].filter(Boolean).join(' > ');
}

/**
 * 按标题将一篇文档切分为多个 Algolia 记录 chunk。
 * 每个 chunk 对应一个标题段落的纯文本内容，上限 MAX_CHUNK_LENGTH 字符。
 * 生成层级面包屑（lvl0/lvl1/...）用于 Algolia 搜索结果的层级展示。
 */
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

/** 处理单个 .md 文件，解析 frontmatter + 展开经文占位符 + 切分为 Algolia 记录 */
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

/** 扫描 docs/ 目录，生成完整的 Algolia 索引文件到 build/algolia-index.json */
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

/** 从 build/algolia-index.json 读取已生成的索引文件 */
function readIndexFile() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error('未找到 build/algolia-index.json，请先运行 npm run index:generate');
  }
  const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
  return JSON.parse(raw);
}

/** 上传索引记录到 Algolia（replaceAllObjects），并配置搜索排名和 facet 设置 */
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
  process.exitCode = 1;
  return;
}

main().catch((error) => {
  console.error('Algolia 索引任务失败：', error.message);
  process.exitCode = 1;
});
