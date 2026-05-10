/**
 * @fileoverview URL slug / HTML anchor ID 生成工具。
 * 将中文标题（如"讲道正文 / 第一点"）规范化为符合 URL 规范的 anchor id。
 * 被 anchor-jump、heading-anchors 插件和 algolia-index 脚本共同引用。
 */

/**
 * 将任意文本规范化为 URL 友好的 slug。
 * 处理流程：全角转半角 → 数字空格合并 → 冒号替换 → 引号去除 → 保留字过滤 → 空格替换为连字符。
 * @param {string} value - 原始文本
 * @returns {string} 规范化的 slug，例如 "sermon-section-1"
 */
function normalizeText(value) {
  return (
    String(value || '')
      .normalize('NFKC')
      .replace(/(\d)\s+(\d)/g, '$1-$2')
      .replace(/[:：]/g, '-')
      .replace(/[""''"]/g, '')
      .replace(/[^a-z0-9一-鿿\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase() || 'section'
  );
}

/**
 * 创建按 section 去重的 slug 生成器。
 * 同一个 section 内如果出现相同的 slug，会自动追加 "-1", "-2" 后缀。
 * 这保证了同一篇讲道中多个同名子标题的 anchor id 唯一。
 *
 * @returns {{getUniqueSlug: (section: string, text: string) => string, reset: () => void}}
 */
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

/**
 * 根据标题层级和当前 section 解析最终的 anchor id。
 * H2 标题：直接用自身文本作为 anchor，同时开始新的 section 作用域。
 * 其他层级：在所属 H2 section 的作用域内去重，生成 "sectionSlug-headingSlug" 格式的 anchor。
 *
 * @param {{level: number, text: string, currentSection: string, slugger: object}} params
 * @returns {{anchor: string, sectionLabel: string}}
 */
function resolveHeadingAnchor({level, text, currentSection, slugger}) {
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
