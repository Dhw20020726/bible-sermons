/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const GithubSlugger = require('github-slugger');

const rootDir = path.join(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const bibleDir = path.join(rootDir, 'static', 'bible', 'cmn-cu89s_readaloud');
const outputPath = path.join(rootDir, 'static', 'algolia-records.json');

const siteConfig = require('../docusaurus.config');

const siteUrl = siteConfig.url?.replace(/\/$/, '') ?? '';
const baseUrl = siteConfig.baseUrl ?? '/';
const docsRouteBasePath =
  (siteConfig.presets?.[0]?.[1]?.docs?.routeBasePath ?? 'docs').replace(/^\//, '').replace(/\/$/, '');

function encodePathSegment(segment) {
  return encodeURI(segment).replace(/#/g, '%23');
}

function buildDocUrl(relativePath, anchor) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\.mdx?$/, '');
  const encodedPath = normalized
    .split('/')
    .map((segment) => encodePathSegment(segment))
    .join('/');
  const anchorPart = anchor ? `#${anchor}` : '';
  return `${siteUrl}${baseUrl}${docsRouteBasePath}/${encodedPath}${anchorPart}`;
}

function walkFiles(dir, exts) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath, exts);
    }
    if (exts.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      return [fullPath];
    }
    return [];
  });
}

function stripScriptureSection(content) {
  const matches = [...content.matchAll(/^##\s+.*$/gm)];
  const sectionIndex = matches.findIndex((match) => match[0].replace(/^##\s+/, '').trim() === '经文摘录');
  if (sectionIndex === -1) {
    return content;
  }
  const start = matches[sectionIndex].index;
  const end = matches[sectionIndex + 1]?.index ?? content.length;
  const withoutSection = content.slice(0, start) + content.slice(end);
  return withoutSection.replace(/\[\[bible\s+passage=.*?\]\]/gi, '');
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDocRecords() {
  const files = walkFiles(docsDir, ['.md', '.mdx']);
  const records = [];

  files.forEach((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const {data, content} = matter(raw);
    const sanitized = stripScriptureSection(content);
    const slugger = new GithubSlugger();
    const relativePath = path.relative(docsDir, filePath);
    let currentHeading = null;

    const lines = sanitized.split('\n');
    let buffer = [];

    function flushBuffer() {
      if (!buffer.length) return;
      const text = stripMarkdown(buffer.join('\n'));
      if (!text) {
        buffer = [];
        return;
      }
      const objectID = `${relativePath}#${currentHeading || 'intro'}#${records.length}`;
      records.push({
        objectID,
        type: 'sermon',
        title: data.title || data.sermonTitle || '',
        scripture: data.scripture || '',
        summary: data.summary || '',
        heading: currentHeading,
        content: text,
        url: buildDocUrl(relativePath, currentHeading),
      });
      buffer = [];
    }

    lines.forEach((line) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushBuffer();
        const [, , headingText] = headingMatch;
        currentHeading = slugger.slug(headingText.trim());
      } else {
        buffer.push(line);
      }
    });
    flushBuffer();
  });

  return records;
}

function parseBibleFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) {
    return [];
  }

  const filename = path.basename(filePath);
  const book = lines[0].replace(/^\uFEFF/, '').replace(/\.+$/, '');
  const chapter = lines[1].replace(/\.+$/, '');

  return lines.slice(2).map((line, idx) => {
    const verse = idx + 1;
    const anchor = `${chapter}-${verse}`;
    const url = `${siteUrl}${baseUrl}bible/cmn-cu89s_readaloud/${encodePathSegment(filename)}#${anchor}`;
    return {
      objectID: `${filename}#${chapter}#${verse}`,
      type: 'bible',
      book,
      chapter,
      verse,
      content: stripMarkdown(line),
      url,
    };
  });
}

function buildBibleRecords() {
  const files = walkFiles(bibleDir, ['.txt']);
  return files.flatMap(parseBibleFile);
}

function main() {
  const sermonRecords = buildDocRecords();
  const bibleRecords = buildBibleRecords();
  const records = [...sermonRecords, ...bibleRecords];

  const settings = {
    attributesForFaceting: ['type', 'book', 'chapter'],
    searchableAttributes: ['title', 'scripture', 'summary', 'heading', 'content'],
  };

  fs.writeFileSync(outputPath, JSON.stringify({records, settings}, null, 2), 'utf8');
  console.log(`Generated ${records.length} records -> ${path.relative(rootDir, outputPath)}`);
}

main();
