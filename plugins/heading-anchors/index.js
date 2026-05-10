/**
 * @fileoverview Docusaurus remark 插件 —— 标题 slug 规范化。
 *
 * 为 Markdown 中所有标题（h2-h6）生成确定的 HTML id 属性。
 * 规则：
 * - H2：直接用标题文本生成 id，同时作为后续标题的"section 作用域"
 * - H3-H6：在所属 H2 作用域内去重，生成 "sectionSlug-headingSlug" 格式的 id
 *
 * 这个插件确保所有标题都有稳定的 anchor，使得：
 * 1. 浏览器 URL hash 跳转（#xxx）能正常工作
 * 2. 右侧目录（TOC）的链接有效
 * 3. Algolia 搜索结果的锚点链接准确
 */

const {toString} = require('mdast-util-to-string');
const {visit} = require('unist-util-visit');
const {createSectionSlugger, normalizeText} = require('../../lib/slug');

module.exports = function slugNormalizePlugin() {
  return (tree) => {
    const {getUniqueSlug} = createSectionSlugger();
    let currentSection = '';

    visit(tree, 'heading', (node) => {
      const text = toString(node).trim();

      // H2：重置 section 作用域，用自身文本作为 anchor
      if (node.depth === 2) {
        const slug = normalizeText(text);
        node.data = node.data || {};
        node.data.id = slug;
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.id = slug;
        currentSection = text;
        return;
      }

      // H3-H6：在当前 section 内去重，前缀为 section slug
      const slug = getUniqueSlug(currentSection, text);
      const sectionSlug = currentSection ? normalizeText(currentSection) : '';
      const resolvedId = sectionSlug ? `${sectionSlug}-${slug}` : slug;

      node.data = node.data || {};
      node.data.id = resolvedId;
      node.data.hProperties = node.data.hProperties || {};
      node.data.hProperties.id = resolvedId;
    });
  };
};
