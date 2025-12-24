const path = require('path');
const fs = require('fs/promises');
const {
  parseMarkdownFile,
  DEFAULT_PARSE_FRONT_MATTER,
  Globby,
  normalizeUrl,
  posixPath,
  createSlugger,
} = require('@docusaurus/utils');

const DEFAULT_OPTIONS = {
  indexDocs: true,
  docsDir: 'docs',
  docsRouteBasePath: 'docs',
};

const CHINESE_SEGMENT_REGEX = /[\u4e00-\u9fff]+/g;
const WORD_REGEX = /[\p{L}\p{N}]+/gu;
const MIN_WORD_LENGTH = 2;
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

function stripMarkdown(raw) {
  return raw
    .replace(/<a[^>]*class(?:Name)?=["']sermon-link["'][^>]*>[\s\S]*?<\/a>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldKeepWord(word) {
  const isSingleLatinChar =
    word.length === 1 && !CHINESE_CHAR_REGEX.test(word) && /[a-z]/.test(word);
  const isNumber = /^\d+$/.test(word);
  return !isSingleLatinChar && (!isNumber || word.length >= MIN_WORD_LENGTH);
}

function tokenize(text) {
  if (!text) {
    return [];
  }
  const tokens = new Set();
  const lower = text.toLowerCase();
  const words = lower.match(WORD_REGEX) ?? [];
  words
    .filter((word) => word.length >= MIN_WORD_LENGTH || shouldKeepWord(word))
    .forEach((word) => tokens.add(word));
  const chineseSegments = text.match(CHINESE_SEGMENT_REGEX) ?? [];
  chineseSegments.forEach((segment) => {
    const chars = Array.from(segment);
    chars.forEach((char) => tokens.add(char));
    const maxGramLength = Math.min(segment.length, 3);
    for (let size = 2; size <= maxGramLength; size += 1) {
      for (let start = 0; start <= segment.length - size; start += 1) {
        tokens.add(segment.slice(start, start + size));
      }
    }
  });
  return Array.from(tokens);
}

function tokenizeFields({ title, heading, content }) {
  return {
    title: tokenize(title),
    heading: tokenize(heading),
    content: tokenize(content),
  };
}

function addTokensToIndex(tokens, field, entryId, invertedIndex) {
  tokens.forEach((token) => {
    if (!invertedIndex[token]) {
      invertedIndex[token] = {
        title: [],
        heading: [],
        content: [],
      };
    }
    invertedIndex[token][field].push(entryId);
  });
}

function buildPermalink({ baseUrl, routeBasePath, docId, slug }) {
  if (slug) {
    if (slug.startsWith('/')) {
      return normalizeUrl([baseUrl, slug]);
    }
    return normalizeUrl([baseUrl, routeBasePath, slug]);
  }
  return normalizeUrl([baseUrl, routeBasePath, docId]);
}

function splitParagraphs(markdownContent) {
  const lines = markdownContent.split(/\r?\n/);
  const paragraphs = [];
  let buffer = [];
  let currentHeading = undefined;
  let currentAnchor = undefined;
  const slugger = createSlugger();

  const flush = () => {
    if (!buffer.length) {
      return;
    }
    const text = stripMarkdown(buffer.join(' '));
    buffer = [];
    if (!text) {
      return;
    }
    paragraphs.push({
      text,
      heading: currentHeading,
      anchor: currentAnchor,
    });
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      return;
    }
    if (trimmed.startsWith('#')) {
      flush();
      const headingText = stripMarkdown(trimmed.replace(/^#+\s*/, ''));
      if (headingText) {
        currentHeading = headingText;
        currentAnchor = slugger.slug(headingText);
      }
      return;
    }
    buffer.push(line);
  });

  flush();
  return paragraphs;
}

async function loadDocsIndex({ docsDir, baseUrl, routeBasePath }) {
  const filePaths = await Globby(['**/*.{md,mdx}'], { cwd: docsDir });
  const entries = [];

  for (const filePath of filePaths) {
    const absolutePath = path.join(docsDir, filePath);
    const fileContent = await fs.readFile(absolutePath, 'utf8');
    const { frontMatter, content, contentTitle } = await parseMarkdownFile({
      filePath: absolutePath,
      fileContent,
      parseFrontMatter: DEFAULT_PARSE_FRONT_MATTER,
      removeContentTitle: true,
    });

    const title =
      frontMatter.title ||
      contentTitle ||
      path.basename(filePath, path.extname(filePath));
    const docFolder = path.dirname(filePath);
    const docName = path.basename(filePath, path.extname(filePath));
    const docId = posixPath(path.join(docFolder === '.' ? '' : docFolder, docName));
    const permalink = buildPermalink({
      baseUrl,
      routeBasePath,
      docId,
      slug: frontMatter.slug,
    });

    const paragraphs = splitParagraphs(content);
    paragraphs.forEach((paragraph) => {
      const entryId = entries.length;
      const entryPermalink = paragraph.anchor
        ? `${permalink}#${paragraph.anchor}`
        : permalink;
      const heading = paragraph.heading ?? '';
      const entry = {
        id: entryId,
        title,
        heading,
        section: heading,
        content: paragraph.text,
        permalink: entryPermalink,
      };
      entries.push(entry);
    });
  }

  return { entries, invertedIndex: {} };
}

module.exports = function searchLocalPlugin(context, options) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { siteDir, siteConfig } = context;
  const baseUrl = siteConfig.baseUrl || '/';
  const docsDir = path.resolve(siteDir, resolvedOptions.docsDir);
  const routeBasePath = resolvedOptions.docsRouteBasePath || 'docs';

  return {
    name: 'local-search',
    async loadContent() {
      if (!resolvedOptions.indexDocs) {
        return { entries: [], invertedIndex: {} };
      }
      return loadDocsIndex({
        docsDir,
        baseUrl,
        routeBasePath,
      });
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
};

module.exports.tokenize = tokenize;
module.exports.tokenizeFields = tokenizeFields;
