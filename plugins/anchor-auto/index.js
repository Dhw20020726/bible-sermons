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

function setAttr(node, name, value) {
  if (!node.attributes) node.attributes = [];
  const existing = node.attributes.find((attr) => attr.name === name);
  if (existing) {
    existing.value = value;
  } else {
    node.attributes.push({type: 'mdxJsxAttribute', name, value});
  }
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

function isAnchorNode(node) {
  return (
    node &&
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    (node.name || '') === 'AnchorAuto'
  );
}

function isAnchorJumpNode(node) {
  return (
    node &&
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    (node.name || '') === 'AnchorJump'
  );
}

function containsAnchorJump(node) {
  if (!node || typeof node !== 'object') return false;
  if (isAnchorJumpNode(node)) return true;
  const {children} = node;
  if (!Array.isArray(children)) return false;
  return children.some((child) => containsAnchorJump(child));
}

function isSkipAnchorAutoNode(node) {
  return (
    node &&
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    (node.name || '') === 'AnchorAutoSkip'
  );
}

function isSkipAnchorAutoComment(node) {
  if (!node) return false;
  if ((node.type === 'html' || node.type === 'comment') && typeof node.value === 'string') {
    return /<!--\s*AnchorAutoSkip\s*-->/.test(node.value);
  }
  return false;
}

function createAnchorAutoNode({slug, mode, label}) {
  return {
    type: 'mdxJsxFlowElement',
    name: 'AnchorAuto',
    attributes: [
      {type: 'mdxJsxAttribute', name: 'slug', value: slug},
      {type: 'mdxJsxAttribute', name: 'mode', value: mode},
      ...(label ? [{type: 'mdxJsxAttribute', name: 'label', value: label}] : []),
    ],
    children: [],
  };
}

function toAnchorJump({node, mode, slug, label, labelProvided, hadChildren}) {
  const idPrefix = mode === 'sermon' ? 'sermon' : 'excerpt';
  const toPrefix = mode === 'sermon' ? 'excerpt' : 'sermon';
  const targetSlug = slug || 'fallback';
  const resolvedLabel = labelProvided ? label : hadChildren ? undefined : label;

  node.type = 'mdxJsxFlowElement';
  node.name = 'AnchorJump';
  setAttr(node, 'id', `${idPrefix}-${targetSlug}`);
  setAttr(node, 'to', `${toPrefix}-${targetSlug}`);
  setAttr(node, 'section', mode === 'sermon' ? '讲道正文' : '经文摘录');
  if (resolvedLabel !== undefined) {
    setAttr(node, 'label', resolvedLabel);
  } else {
    node.attributes = (node.attributes || []).filter((attr) => attr.name !== 'label');
  }
  node.attributes = node.attributes.filter((attr) => attr.name !== 'mode' && attr.name !== 'slug');
  if (!hadChildren && resolvedLabel) {
    node.children = [{type: 'text', value: resolvedLabel}];
  }
}

function normalizeAnchorJumpNode(node, {currentSection, currentSlug, autoModeBySection}) {
  const props = {};
  let labelProvided = false;
  (node.attributes || []).forEach((attr) => {
    if (attr && attr.name) {
      props[attr.name] = attr.value;
      if (attr.name === 'label') {
        labelProvided = true;
      }
    }
  });

  const hadChildren = Array.isArray(node.children) && node.children.length > 0;
  const sectionInfo = autoModeBySection[currentSection] || null;
  const mode = props.mode || (sectionInfo && sectionInfo.mode) || 'excerpt';
  const label =
    props.label ||
    (sectionInfo && sectionInfo.label) ||
    (mode === 'sermon' ? '→ 经文' : '→ 讲道');
  const slug = props.slug || currentSlug || 'fallback';

  toAnchorJump({node, mode, slug, label, labelProvided, hadChildren});
}

function normalizeParagraphAnchors(root) {
  function normalize(node) {
    const {children} = node || {};
    if (!Array.isArray(children)) return;

    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.type === 'paragraph') {
        const segments = [];
        let buffer = [];
        (child.children || []).forEach((grandChild) => {
          if (isAnchorNode(grandChild)) {
            if (buffer.length) {
              segments.push({type: 'paragraph', children: buffer});
              buffer = [];
            }
            segments.push({...grandChild, type: 'mdxJsxFlowElement'});
          } else {
            buffer.push(grandChild);
          }
        });
        if (buffer.length) {
          segments.push({type: 'paragraph', children: buffer});
        }
        if (segments.length > 1 || (segments[0] && segments[0] !== child)) {
          children.splice(i, 1, ...segments);
          i += segments.length - 1;
          continue;
        }
      }
      normalize(child);
    }
  }

  normalize(root);
}

module.exports = function anchorAutoPlugin() {
  return (tree) => {
    const slugger = createSlugger();
    const autoModeBySection = {
      经文摘录: {mode: 'excerpt', label: '→ 讲道'},
      讲道正文: {mode: 'sermon', label: '→ 经文'},
    };

    let currentSection = '';
    let currentSlug = '';

    walk(tree, (node, index, parent) => {
      if (node.type === 'heading') {
        const text = getText(node).trim();
        const slug = slugger(text);

        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.id = slug;
        node.data.id = slug;

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

        if (node.depth === 3 && parent && Array.isArray(parent.children)) {
          const sectionInfo = autoModeBySection[currentSection] || {mode: 'excerpt', label: '→ 讲道'};
          let skipAuto = false;
          const insertionIndex = index + 1;
          for (let i = index + 1; i < parent.children.length; i += 1) {
            const sibling = parent.children[i];
            if (sibling.type === 'heading' && sibling.depth <= node.depth) {
              break;
            }
            if (isSkipAnchorAutoNode(sibling) || isSkipAnchorAutoComment(sibling)) {
              parent.children.splice(i, 1);
              skipAuto = true;
              break;
            }
            if (isAnchorNode(sibling) || isAnchorJumpNode(sibling) || containsAnchorJump(sibling)) {
              skipAuto = true;
              break;
            }
          }

          if (!skipAuto) {
            parent.children.splice(
              insertionIndex,
              0,
              createAnchorAutoNode({
                slug,
                mode: sectionInfo.mode,
                label: sectionInfo.label,
              }),
            );
          }
        }

        currentSlug = slug;
        return;
      }
    });

    normalizeParagraphAnchors(tree);

    currentSection = '';
    currentSlug = '';

    walk(tree, (node) => {
      if (node.type === 'heading') {
        const text = getText(node).trim();
        const slug = slugger(text);

        if (node.depth === 2) {
          currentSection = text;
          if (text === '经文摘录') {
            currentSlug = 'fallback';
            return;
          }
          if (text === '讲道正文') {
            currentSlug = 'fallback';
            return;
          }
        }
        currentSlug = slug;
        return;
      }

      if (isAnchorNode(node) || isAnchorJumpNode(node)) {
        normalizeAnchorJumpNode(node, {currentSection, currentSlug, autoModeBySection});
      }
    });
  };
};
