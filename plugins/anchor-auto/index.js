function walk(node, visitor, index = null, parent = null) {
  if (!node) return;
  visitor(node, index, parent);
  const {children} = node;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      walk(children[i], visitor, i, node);
    }
  }
}

function getText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map((child) => getText(child)).join('');
  }
  return '';
}

function createSlugger() {
  return (value) => {
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
  };
}

function setAttr(node, name, value) {
  if (!node.attributes) node.attributes = [];
  const existing = node.attributes.find((attr) => attr.name === name);
  if (existing) {
    existing.value = value;
  } else {
    node.attributes.push({type: 'mdxJsxAttribute', name, value});
  }
}

function toAnchorJump({node, mode, slug, label}) {
  const idPrefix = mode === 'sermon' ? 'sermon' : 'excerpt';
  const toPrefix = mode === 'sermon' ? 'excerpt' : 'sermon';
  const targetSlug = slug || 'fallback';

  node.name = 'AnchorJump';
  setAttr(node, 'id', `${idPrefix}-${targetSlug}`);
  setAttr(node, 'to', `${toPrefix}-${targetSlug}`);
  setAttr(node, 'label', label);
  node.attributes = node.attributes.filter(
    (attr) => attr.name !== 'mode' && attr.name !== 'slug' && attr.name !== 'label',
  );
  node.children = [{type: 'text', value: label}];
}

module.exports = function anchorAutoPlugin() {
  return (tree) => {
    const slugger = createSlugger();
    let currentSection = '';
    let currentSlug = '';

    const autoModeBySection = {
      经文摘录: {mode: 'excerpt', label: '→ 讲道'},
      讲道正文: {mode: 'sermon', label: '→ 经文'},
    };

    walk(tree, (node, _index, _parent) => {
      if (node.type === 'heading') {
        const text = getText(node).trim();
        const slug = slugger(text);

        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.id = slug;

        if (node.depth === 2) {
          currentSection = text;
          if (text === '经文摘录') {
            node.data.hProperties.id = 'excerpt-fallback';
            currentSlug = 'fallback';
            return;
          }
          if (text === '讲道正文') {
            node.data.hProperties.id = 'sermon-fallback';
            currentSlug = 'fallback';
            return;
          }
        }
        currentSlug = slug;
        return;
      }

      if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        (node.name || '') === 'AnchorAuto'
      ) {
        const props = {};
        (node.attributes || []).forEach((attr) => {
          if (attr && attr.name) {
            props[attr.name] = attr.value;
          }
        });

        const sectionInfo = autoModeBySection[currentSection] || null;
        const mode = props.mode || (sectionInfo && sectionInfo.mode) || 'excerpt';
        const label =
          props.label ||
          (sectionInfo && sectionInfo.label) ||
          (mode === 'sermon' ? '→ 经文' : '→ 讲道');
        const slug = props.slug || currentSlug || 'fallback';

        toAnchorJump({node, mode, slug, label});
      }
    });
  };
};
