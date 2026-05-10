/**
 * @fileoverview Docusaurus remark 插件 —— 圣经经文嵌入。
 *
 * 在 Markdown 解析阶段，扫描文本中的 [[bible passage="创世记 2:7"]] 占位符，
 * 从 static/bible/<版本>/ 的 .txt 文件中读取真实经文内容，
 * 替换为 <blockquote class="bible-text"> 的 HTML AST 节点。
 *
 * 数据来源：static/bible/cmn-cu89s_readaloud/ 下的 .txt 文件，
 * 格式为每行一节经文。特殊标记 [[verses=N]] 表示一行覆盖连续 N 节。
 *
 * 对外导出 buildBookIndex 和 loadChapterLines 供 scripts/ 复用。
 *
 * 核心流程：
 *   Markdown 文本 → 正则匹配占位符 → parsePassage() 解析引用
 *   → buildBookIndex() 定位文件 → loadChapterLines() 读取章节
 *   → buildVerseMap() 构建经文映射 → renderPassage() 生成 AST
 */

const fs = require('fs');
const path = require('path');
const {normalizeBookName, parseAttributes, parseSegment, parsePassage} = require('../../lib/bible-parser');

/**
 * 深度优先遍历 MDAST 语法树，对匹配类型的节点执行回调。
 * 返回值为数字时跳过该节点的子节点（优化遍历）。
 */
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

/** 默认圣经版本目录名 */
const DEFAULT_VERSION = 'cmn-cu89s_readaloud';

/** 缓存已构建的书名索引，避免重复扫描文件系统 */
const CACHE = new Map();

/**
 * 构建"书名 → 文件信息"索引。
 * 扫描 static/bible/<version>/ 下所有 _read.txt 文件，
 * 读取每文件第一行（书名），建立映射。
 *
 * 文件名格式：<prefix>_<seq>_<abbr>_<chapter>_read.txt
 * 例如：cmn-cu89s_001_GEN_001_read.txt
 *
 * @returns {Map<string, {seq: string, abbr: string, prefix: string, chapterDigits: number}>}
 */
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
    if (seq === '000' && abbr === '000') continue; // 跳过索引文件
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

/**
 * 读取指定书卷章节的全部行（含标题行和经文行）。
 * chapterDigits 用于补零格式化章节号（如 "001" vs "01"）。
 *
 * @returns {string[]} 文本行数组，第 0 行是书名，第 1 行是章号，第 2 行起是经文
 */
function loadChapterLines(baseDir, version, mapping, book, chapter) {
  const info = mapping.get(book);
  if (!info) {
    throw new Error(`未找到卷书 "${book}" 的映射`);
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

/**
 * 将章节文本行构建为 "节号 → 经文条目" 的映射。
 * 支持 [[verses=N]] / [[span=N]] 多节标记：
 * 一行文本可以覆盖连续多个节号（例如诗歌段落），后续节号会自动递增。
 *
 * @returns {Map<number, {start: number, end: number, text: string}>}
 */
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

/**
 * 将解析后的经文引用渲染为 remark AST 节点。
 * 生成 <blockquote class="bible-text"> 块，内含多条 <p class="verse"> 段落，
 * 每段包含 <strong class="verse-number"> 节号 和经文文本。
 *
 * @param {{baseDir: string, version: string, passage: string}} params
 * @returns {object} remark AST 节点（blockquote 或 error paragraph）
 */
function renderPassage({baseDir, version, passage}) {
  try {
    const mapping = buildBookIndex(baseDir, version);
    const segments = parsePassage(passage);           // 来自 lib/bible-parser.js
    const verses = [];

    for (const segment of segments) {
      const lines = loadChapterLines(baseDir, version, mapping, segment.book, segment.chapter);
      const verseMap = buildVerseMap(lines);
      for (const range of segment.ranges) {
        let lastEntry = null;
        for (let v = range.start; v <= range.end; v += 1) {
          const entry = verseMap.get(v);
          if (entry && entry === lastEntry) {
            continue; // 多节共享同一行文本时，跳过重复的 entry
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

    // 构造 remark AST 节点（不是 HTML 字符串，而是被 rehype 处理的中间表示）
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
    // 解析失败时不打断构建，而是渲染一个红色错误提示段落
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

/**
 * Docusaurus remark 插件入口。
 * 在 Markdown 解析为 MDAST 后、转为 HTML 前执行。
 * 扫描所有 text 节点，将 [[bible ...]] / {{bible ...}} 占位符替换为经文 AST。
 */
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
        // 占位符前的普通文本保持不变
        const before = node.value.slice(lastIndex, match.index);
        if (before) {
          newNodes.push({type: 'text', value: before});
        }
        const attrText = match[1] || match[2] || '';
        const attrs = parseAttributes(attrText);       // 来自 lib/bible-parser.js
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

// 导出工具函数给 scripts/algoliaIndex.js 等复用
module.exports.buildBookIndex = buildBookIndex;
module.exports.loadChapterLines = loadChapterLines;
