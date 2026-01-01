const {slug: githubSlug} = require('github-slugger');
const toString = require('mdast-util-to-string');
const visit = require('unist-util-visit');

function createSlugger() {
  const seen = new Map();

  return (value) => {
    const base = githubSlug(
      String(value || '')
        .normalize('NFKC')
        .replace(/(\d)\s+(\d)/g, '$1-$2')
        .replace(/[:：]/g, ' - ')
        .trim(),
    );

    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    if (count === 0) return base;
    return `${base}-${count}`;
  };
}

module.exports = function slugNormalizePlugin() {
  return (tree) => {
    const slugger = createSlugger();

    visit(tree, 'heading', (node) => {
      const text = toString(node);
      const slug = slugger(text);

      node.data = node.data || {};
      node.data.id = slug;
      node.data.hProperties = node.data.hProperties || {};
      node.data.hProperties.id = slug;
    });
  };
};
