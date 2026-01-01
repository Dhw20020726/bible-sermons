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

  function reset() {
    slugCountBySection.clear();
  }

  return {getUniqueSlug, reset};
}

function resolveHeadingAnchor({level, text, currentSection, slugger}) {
  // H2 直接使用自身 slug，其余在 H2 作用域内去重并带上 section slug 前缀
  if (level === 2) {
    return {
      anchor: normalizeText(text),
      sectionLabel: text,
    };
  }

  const sectionLabel = currentSection || '';
  const sectionSlug = sectionLabel ? normalizeText(sectionLabel) : '';
  const uniqueSlug = slugger.getUniqueSlug(sectionLabel, text);
  const anchor = sectionSlug ? `${sectionSlug}-${uniqueSlug}` : uniqueSlug;

  return {
    anchor,
    sectionLabel,
  };
}

module.exports = {
  normalizeText,
  createSectionSlugger,
  resolveHeadingAnchor,
};
