const {toString} = require('mdast-util-to-string');
const {visit} = require('unist-util-visit');

function normalizeText(value) {
  return (
    String(value || '')
      .normalize('NFKC')
      .replace(/(\d)\s+(\d)/g, '$1-$2')
      .replace(/[:：]/g, '-')
      .replace(/[\u201c\u201d\u2018\u2019]/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase() || 'section'
  );
}

function createSectionSlugger() {
  const slugCountBySection = new Map();

  function getSectionKey(section) {
    return section || '__global__';
  }

  function getUniqueSlug(section, text) {
    const baseSlug = normalizeText(text);
    const sectionKey = getSectionKey(section);
    if (!slugCountBySection.has(sectionKey)) {
      slugCountBySection.set(sectionKey, new Map());
    }
    const sectionMap = slugCountBySection.get(sectionKey);
    const currentCount = sectionMap.get(baseSlug) || 0;
    sectionMap.set(baseSlug, currentCount + 1);
    if (currentCount === 0) return baseSlug;
    return `${baseSlug}-${currentCount}`;
  }

  return {getUniqueSlug};
}

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
