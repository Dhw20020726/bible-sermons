/**
 * @fileoverview Docusaurus remark 插件 —— 经文自动插入。
 *
 * 依据 Markdown 中 H2 标题的经文引用（如 "## 创世记 2:7"），
 * 自动在其后插入对应的经文 <blockquote>，无需手动书写 [[bible passage="..."]] 占位符。
 *
 * 支持的标题格式：
 * - 单段引用："## 创世记 2:7"
 * - 范围引用："## 创世记 2:8-9"
 * - 多段引用（顿号分隔）："## 创世记 15:6、希伯来书 11:1"
 * - 省略书名的后续引用："## 提摩太后书 4:16、1:15"（"1:15" 继承前一段的书名）
 * - 非经文标题（如 "引言"）：自动跳过，不插入任何经文
 *
 * 多段引用时，每段经文前会额外插入一个粗体小标题（<p class="bible-label">），
 * 便于读者区分同一标题下的多段经文。
 *
 * 核心流程：
 *   heading 节点 → parseHeadingRefs() 解析标题 → renderPassage() 生成经文 AST
 *   → 插入到标题节点之后
 */

const path = require('path');
const {toString} = require('mdast-util-to-string');
const {visit} = require('unist-util-visit');
const {renderPassage, DEFAULT_VERSION} = require('../bible-embed');

/**
 * 将标题文本解析为若干完整经文引用字符串。
 * 标题须包含 "章:节" 结构（如 "2:7"）才视为经文引用；否则返回 null（如 "引言"）。
 *
 * 书名判定：以数字开头的段落视为省略了书名（如 "1:15"、"6:47"），
 * 继承第一段（标题开头）的书名；其余段落自带书名（如 "创世记 15:6"）。
 *
 * @param {string} text - 标题文本
 * @returns {string[] | null} 完整经文引用数组，非经文标题返回 null
 */
function parseHeadingRefs(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || !/\d+\s*:\s*\d/.test(trimmed)) return null;

  const parts = trimmed
    .split(/[、]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // 标题第一段必须自带书名（"书 章:节"），否则视为非经文标题
  if (/^\d/.test(parts[0])) return null;
  const fallbackBook = parts[0].split(/\s+/)[0];

  const refs = [];
  for (const part of parts) {
    // 以数字开头 → 省略书名（如 "1:15"），继承第一段的书名
    const hasBook = !/^\d/.test(part);
    refs.push(hasBook ? part : `${fallbackBook} ${part}`);
  }
  return refs;
}

/**
 * Docusaurus remark 插件入口。
 * 在 Markdown 解析为 MDAST 后执行，遍历所有 H2 标题，
 * 为经文引用标题自动插入经文 blockquote。
 */
module.exports = function autoBiblePlugin(userOptions = {}) {
  const baseDir = userOptions.baseDir || path.join(process.cwd(), 'static', 'bible');
  const version = userOptions.version || DEFAULT_VERSION;

  return (tree) => {
    visit(tree, 'heading', (node, index, parent) => {
      if (node.depth !== 2 || !parent || index === null || index === undefined) {
        return;
      }

      const refs = parseHeadingRefs(toString(node).trim());
      if (!refs || refs.length === 0) return;

      // 生成要插入的节点：多段引用时每段前额外插入一个粗体小标题
      const inserts = [];
      for (const ref of refs) {
        if (refs.length > 1) {
          inserts.push({
            type: 'paragraph',
            data: {hProperties: {className: ['bible-label']}},
            children: [{type: 'strong', children: [{type: 'text', value: ref}]}],
          });
        }
        inserts.push(renderPassage({baseDir, version, passage: ref}));
      }

      parent.children.splice(index + 1, 0, ...inserts);
    });
  };
};
