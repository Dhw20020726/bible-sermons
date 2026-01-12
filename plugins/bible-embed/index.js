const fs = require('fs');
const path = require('path');
function visit(node, type, callback, index = null, parent = null) {
  if (!node) return;
  if (node.type === type) {
    const result = callback(node, index, parent);
    if (typeof result === 'number') {
      return;
    }
  }
  const children = node.children;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      visit(children[i], type, callback, i, node);
    }
  }
}

const DEFAULT_VERSION = 'cmn-cu89s_readaloud';
const CACHE = new Map();

function normalizeBookName(name) {
  if (!name) return '';
  return String(name)
    .replace(/^\uFEFF/, '')
    .replace(/[．。.]$/g, '')
    .trim();
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

function buildBookIndex(baseDir, version) {
  const cacheKey = `${baseDir}::${version}`;
  if (CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey);
  }

  const versionDir = path.join(baseDir, version);
  const files = fs
    .readdirSync(versionDir)
    .filter((file) => /_read\.txt$/i.test(file));

  const byBook = new Map();
  for (const file of files) {
    const match = file.match(
      /^(?<prefix>[a-z0-9-]+)_(?<seq>\d{3})_(?<abbr>[A-Z0-9]{3})_(?<chapter>\d{2,3})_read\.txt$/i,
    );
    if (!match) continue;
    const {prefix, seq, abbr, chapter} = match.groups;
    if (seq === '000' && abbr === '000') continue;
    const fullPath = path.join(versionDir, file);
    const firstLine = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)[0];
    const bookName = normalizeBookName(firstLine);
    if (!bookName) continue;
    if (!byBook.has(bookName)) {
      byBook.set(bookName, {seq, abbr, prefix, chapterDigits: chapter.length});
    }
  }

  CACHE.set(cacheKey, byBook);
  return byBook;
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

function loadChapterLines(baseDir, version, mapping, book, chapter) {
  const info = mapping.get(book);
  if (!info) {
    throw new Error(`未找到卷书 “${book}” 的映射`);
  }
  const chapterStr = String(chapter).padStart(info.chapterDigits || 2, '0');
  const filename = `${info.prefix}_${info.seq}_${info.abbr}_${chapterStr}_read.txt`;
  const fullPath = path.join(baseDir, version, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`未找到章节文件：${filename}`);
  }
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  return lines;
}

function buildVerseMap(lines) {
  const verseMap = new Map();
  let verseNumber = 1;
  const spanPattern = /^\[\[\s*(?:verses|span)\s*=\s*(\d+)\s*\]\]\s*/;

  for (let i = 2; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    let lineText = rawLine.trim();
    let span = 1;
    const spanMatch = lineText.match(spanPattern);
    if (spanMatch) {
      span = Number.parseInt(spanMatch[1], 10);
      lineText = lineText.slice(spanMatch[0].length).trim();
    }
    if (Number.isNaN(span) || span < 1) {
      span = 1;
    }
    const start = verseNumber;
    const end = verseNumber + span - 1;
    const entry = {start, end, text: lineText};
    for (let offset = 0; offset < span; offset += 1) {
      verseMap.set(verseNumber + offset, entry);
    }
    verseNumber = end + 1;
  }

  return verseMap;
}

function renderPassage({baseDir, version, passage}) {
  try {
    const mapping = buildBookIndex(baseDir, version);
    const segments = parsePassage(passage);
    const verses = [];

    for (const segment of segments) {
      const lines = loadChapterLines(baseDir, version, mapping, segment.book, segment.chapter);
      const verseMap = buildVerseMap(lines);
      for (const range of segment.ranges) {
        let lastEntry = null;
        for (let v = range.start; v <= range.end; v += 1) {
          const entry = verseMap.get(v);
          if (entry && entry === lastEntry) {
            continue;
          }
          lastEntry = entry;
          const text = (entry && entry.text ? entry.text : '').trim();
          const number = entry
            ? entry.start === entry.end
              ? String(entry.start)
              : `${entry.start}-${entry.end}`
            : String(v);
          const verseText =
            text || `[${segment.book} ${segment.chapter}:${number} 未找到内容]`;
          verses.push({
            number,
            text: verseText,
            missing: !text,
          });
        }
      }
    }

    return {
      type: 'blockquote',
      data: {
        hName: 'blockquote',
        hProperties: {
          className: ['bible-text'],
          'data-passage': passage,
          'data-version': version,
        },
      },
      children: verses.map((verse) => ({
        type: 'paragraph',
        data: {
          hProperties: {
            className: ['verse'].concat(verse.missing ? ['missing'] : []),
          },
        },
        children: [
          {
            type: 'strong',
            data: {hProperties: {className: ['verse-number']}},
            children: [{type: 'text', value: String(verse.number)}],
          },
          {
            type: 'text',
            value: ` ${verse.text}`,
            data: {hProperties: {className: ['verse-text']}},
          },
        ],
      })),
    };
  } catch (error) {
    return {
      type: 'paragraph',
      data: {
        hProperties: {
          className: ['bible-text', 'bible-text--error'],
        },
      },
      children: [
        {
          type: 'text',
          value: `无法解析经文占位符（${passage}）：${error.message}`,
        },
      ],
    };
  }
}

module.exports = function bibleEmbedPlugin(userOptions = {}) {
  const baseDir = userOptions.baseDir || path.join(process.cwd(), 'static', 'bible');
  const defaultVersion = userOptions.version || DEFAULT_VERSION;
  const pattern =
    /\{\{\s*bible\s+([^}]+)\s*\}\}|\[\[\s*bible\s+([^\]]+)\s*\]\]/gi;

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || !node.value || !pattern.test(node.value)) {
        return;
      }
      pattern.lastIndex = 0;
      const newNodes = [];
      let lastIndex = 0;
      let match;
      // eslint-disable-next-line no-cond-assign
      while ((match = pattern.exec(node.value))) {
        const before = node.value.slice(lastIndex, match.index);
        if (before) {
          newNodes.push({type: 'text', value: before});
        }
        const attrText = match[1] || match[2] || '';
        const attrs = parseAttributes(attrText);
        const version = attrs.version || defaultVersion;
        const passage = attrs.passage || attrs.ref || '';
        const rendered = renderPassage({baseDir, version, passage});
        newNodes.push(rendered);
        lastIndex = match.index + match[0].length;
      }
      const after = node.value.slice(lastIndex);
      if (after) {
        newNodes.push({type: 'text', value: after});
      }
      if (newNodes.length > 0) {
        parent.children.splice(index, 1, ...newNodes);
        return index + newNodes.length;
      }
      return undefined;
    });
  };
};

module.exports.buildBookIndex = buildBookIndex;
module.exports.loadChapterLines = loadChapterLines;
