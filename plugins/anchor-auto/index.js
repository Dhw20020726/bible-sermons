const path = require('path');

function visit(node, type, callback, index = null, parent = null) {
  if (!node) return;
  if (node.type === type) {
    const result = callback(node, index, parent);
    if (typeof result === 'number') {
      return;
    }
  }
  const {children} = node;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      visit(children[i], type, callback, i, node);
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


function createAnchorAutoNode(slug) {
  return {
    type: "mdxJsxFlowElement",
    name: "AnchorAuto",
    attributes: slug ? [{type: "mdxJsxAttribute", name: "slug", value: slug}] : [],
    children: [],
  };
}

function createSlugger() {
  const seen = new Map();
  return (value) => {
    const base = String(value || '')
      .normalize('NFKC')
      .replace(/[\u201c\u201d\u2018\u2019]/g, '')
      .replace(/[^a-z0-9\u4e00-\u9fff\s-]/giu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const safeBase = base || 'section';
    const count = seen.get(safeBase) || 0;
    const next = count === 0 ? safeBase : `${safeBase}-${count}`;
    seen.set(safeBase, count + 1);
    return next;
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
  node.attributes = node.attributes.filter(
    (attr) => attr.name !== 'mode' && attr.name !== 'slug' && attr.name !== 'section',
  );
  node.children = [
    {
      type: 'mdxTextExpression',
      value: JSON.stringify(label),
      data: {estree: null},
    },
  ];
}

module.exports = function anchorAutoPlugin() {
  return (tree) => {
    const slugger = createSlugger();
    const headingCounts = new Map();
    let currentSection = '';
    let currentSlug = '';
    let inExcerptSection = false;

    visit(tree, 'heading', (node, index, parent) => {
      const text = getText(node).trim();
      const slug = slugger(text);
      const count = headingCounts.get(slug) || 0;
      const finalSlug = count === 0 ? slug : `${slug}-${count}`;
      headingCounts.set(slug, count + 1);

      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};
      node.data.hProperties.id = finalSlug;

      if (node.depth === 2) {
        currentSection = text;
        inExcerptSection = text === '经文摘录';
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
      currentSlug = finalSlug;

      if (inExcerptSection && node.depth === 3 && parent && Array.isArray(parent.children)) {
        const nextIndex = index + 1;
        const nextNode = parent.children[nextIndex];
        const isAnchorAuto =
          nextNode &&
          (nextNode.name === 'AnchorAuto' ||
            (nextNode.type === 'mdxJsxFlowElement' && nextNode.name === 'AnchorAuto') ||
            (nextNode.type === 'mdxJsxTextElement' && nextNode.name === 'AnchorAuto'));
        if (!isAnchorAuto) {
          parent.children.splice(nextIndex, 0, createAnchorAutoNode(finalSlug));
        }
      }
      return undefined;
    });

    const autoModeBySection = {
      经文摘录: {mode: 'excerpt', label: '→ 讲道'},
      讲道正文: {mode: 'sermon', label: '→ 经文'},
    };

    const handler = (node) => {
      const nodeName = node.name || '';
      if (nodeName !== 'AnchorAuto') return;

      const props = {};
      (node.attributes || []).forEach((attr) => {
        if (attr && attr.name) {
          props[attr.name] = attr.value;
        }
      });

      const explicitMode = props.mode;
      const sectionInfo = autoModeBySection[currentSection] || null;
      const mode = explicitMode || (sectionInfo && sectionInfo.mode) || 'excerpt';
      const label =
        props.label ||
        (sectionInfo && sectionInfo.label) ||
        (mode === 'sermon' ? '→ 经文' : '→ 讲道');

      const slug = props.slug || currentSlug || 'fallback';
      toAnchorJump({node, mode, slug, label});
      return undefined;
    };

    visit(tree, 'mdxJsxFlowElement', (node, index, parent) => handler(node, index, parent));
    visit(tree, 'mdxJsxTextElement', (node, index, parent) => handler(node, index, parent));
  };
};
