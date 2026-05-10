/**
 * @fileoverview 圣经经文引用解析工具。
 * 将 "创世记 2:7-9" 这种字符串解析为结构化的 {book, chapter, ranges} 对象。
 * 被 bible-embed 插件和 algoliaIndex 脚本共同引用，避免重复代码。
 *
 * 核心流程：
 *   parsePassage("创世记 2:7-9; 3:1") → [{book: "创世记", chapter: 2, ranges: [{start:7, end:9}]}, ...]
 */

/**
 * 规范化圣经书名：去掉 BOM、尾部标点、首尾空白。
 * @param {string} name - 原始书名
 * @returns {string} 规范化后的书名
 */
function normalizeBookName(name) {
  if (!name) return '';
  return String(name)
    .replace(/^﻿/, '')
    .replace(/[．。.]*$/g, '')
    .trim();
}

/**
 * 解析 HTML 风格的属性字符串，例如 'passage="创世记 2:7" version="cu89s"'。
 * @param {string} raw - 原始属性字符串
 * @returns {Record<string, string>} 键值对对象
 */
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

/**
 * 解析单段经文节引用，例如 "2:7-9" 或 "创世记 2:7"。
 * fallbackBook 用于省略书名的后续引用，如 "创世记 2:7; 3:1" 中 "3:1" 的书名继承自第一段。
 * @param {string} rawSegment - 原始节段字符串
 * @param {string} fallbackBook - 继承的书名
 * @returns {{book: string, chapter: number, ranges: Array<{start: number, end: number}>} | null}
 */
function parseSegment(rawSegment, fallbackBook) {
  const segment = rawSegment.trim();
  if (!segment) return null;

  const bookMatch = segment.match(/^(?<book>[一-鿿A-Za-z0-9]+)\s+(?<rest>.+)$/);
  const book = bookMatch ? normalizeBookName(bookMatch.groups.book) : fallbackBook;
  const versePart = bookMatch ? bookMatch.groups.rest : segment;
  const match = versePart.match(/^(?<chapter>\d+)\s*:\s*(?<verses>.+)$/);
  if (!match || !book) return null;

  const chapter = Number.parseInt(match.groups.chapter, 10);
  const ranges = match.groups.verses
    .split(/[;,，；]/)           // 支持中英文分隔符
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

/**
 * 解析完整的经文引用字符串。
 * 支持多段引用，用分号分隔，例如 "创世记 2:7-9; 3:1,4"。
 * 后面的段可以省略书名，会自动继承第一段的书名。
 * @param {string} passage - 完整的经文引用字符串
 * @returns {Array<{book: string, chapter: number, ranges: Array}>} 解析结果数组
 * @throws {Error} 如果 passage 为空或无法解析
 */
function parsePassage(passage) {
  const trimmed = (passage || '').trim();
  if (!trimmed) {
    throw new Error('passage 不能为空');
  }
  const [bookPart, ...restParts] = trimmed.split(/\s+/);
  const fallbackBook = normalizeBookName(bookPart);
  const rest = restParts.join(' ');
  if (!fallbackBook || !rest) {
    throw new Error('passage 需要包含卷书名和节段，例如 "创世记 2:7-9"');
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

module.exports = {
  normalizeBookName,
  parseAttributes,
  parseSegment,
  parsePassage,
};
