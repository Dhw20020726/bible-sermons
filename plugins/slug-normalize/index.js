const {toString} = require('mdast-util-to-string');
const {visit} = require('unist-util-visit');
const {createSectionSlugger, normalizeText} = require('../../scripts/utils/slug');

module.exports = function slugNormalizePlugin() {
  return (tree) => {
    const {getUniqueSlug} = createSectionSlugger();
    let currentSection = '';

    visit(tree, 'heading', (node) => {
      const text = toString(node).trim();

      if (node.depth === 2) {
        const slug = normalizeText(text);
        node.data = node.data || {};
        node.data.id = slug;
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.id = slug;
        currentSection = text;
        return;
      }

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
