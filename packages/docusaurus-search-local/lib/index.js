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

const CHINESE_REGEX = /[\u4e00-\u9fff]/g;
const WORD_REGEX = /[\p{L}\p{N}]+/gu;

function stripMarkdown(raw) {
  return raw
    .replace(/<a[^>]*class(?:Name)?=["']sermon-link["'][^>]*>[\s\S]*?<\/a>/gi, ' ')
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

function tokenize(text) {
  if (!text) {
    return [];
  }
  const tokens = new Set();
  const lower = text.toLowerCase();
  const words = lower.match(WORD_REGEX) ?? [];
  words.forEach((word) => tokens.add(word));
  const chineseChars = text.match(CHINESE_REGEX) ?? [];
  chineseChars.forEach((char) => tokens.add(char));
  return Array.from(tokens);
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
  const invertedIndex = {};

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
      const entry = {
        id: entryId,
        title,
        section: paragraph.heading,
        content: paragraph.text,
        permalink: entryPermalink,
      };
      entries.push(entry);
      const tokens = tokenize(`${title} ${paragraph.heading ?? ''} ${paragraph.text}`);
      tokens.forEach((token) => {
        if (!invertedIndex[token]) {
          invertedIndex[token] = [];
        }
        invertedIndex[token].push(entryId);
      });
    });
  }

  return { entries, invertedIndex };
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
