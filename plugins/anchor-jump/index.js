/**
 * @fileoverview Docusaurus remark 插件 —— 经文 / 讲道互跳锚点自动生成。
 *
 * 核心功能：在一篇讲道文档中，"经文摘录"和"讲道正文"两节之间自动生成互跳链接。
 * 每个 H3 标题后插入一个 <AnchorJump> 组件，点击后跳转到对方 section 的对应位置。
 *
 * 两阶段处理：
 *   第一阶段（heading walk）：在每个 H3 之后插入临时的 <AnchorAuto> 节点
 *   第二阶段（normalize walk）：将所有 AnchorAuto/AnchorJump 节点的属性规范化为最终形态
 *
 * 相关 React 组件：src/components/AnchorJump.jsx（渲染跳转链接）
 * MDX 组件映射：src/theme/MDXComponents.js（将 AnchorJump 映射为 React 组件）
 */

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

const {normalizeText, createSectionSlugger} = require('../../lib/slug');

/** 递归提取 MDX 节点的纯文本内容 */
function getText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map((child) => getText(child)).join('');
  }
  return '';
}

/** 设置或更新 MDX JSX 节点的属性 */
function setAttr(node, name, value) {
  if (!node.attributes) node.attributes = [];
  const existing = node.attributes.find((attr) => attr.name === name);
  if (existing) {
    existing.value = value;
  } else {
    node.attributes.push({type: 'mdxJsxAttribute', name, value});
  }
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

/** 检查节点子树中是否包含 AnchorJump（已手动插入时跳过自动生成） */
function containsAnchorJump(node) {
  if (!node || typeof node !== 'object') return false;
  if (isAnchorJumpNode(node)) return true;
  const {children} = node;
  if (!Array.isArray(children)) return false;
  return children.some((child) => containsAnchorJump(child));
}

/**
 * 检查是否为 AnchorAutoSkip 标记节点。
 * 可以在 Markdown 中通过 <AnchorAutoSkip /> 手动跳过某个 H3 的自动锚点生成。
 */
function isSkipAnchorAutoNode(node) {
  return (
    node &&
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    (node.name || '') === 'AnchorAutoSkip'
  );
}

/** 创建临时的 AnchorAuto 节点，第二阶段会被转换为 AnchorJump */
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

/**
 * 将 AnchorAuto 节点就地转换为最终的 AnchorJump 节点。
 * mode='sermon' → 显示"→ 经文"，id 为 "sermon-<slug>"，to 指向 "excerpt-<slug>"
 * mode='excerpt' → 显示"→ 讲道"，id 为 "excerpt-<slug>"，to 指向 "sermon-<slug>"
 */
function toAnchorJump({
  node,
  mode,
  slug,
  label,
  labelProvided,
  hadChildren,
  id,
  to,
  idProvided,
  toProvided,
}) {
  const idPrefix = mode === 'sermon' ? 'sermon' : 'excerpt';
  const toPrefix = mode === 'sermon' ? 'excerpt' : 'sermon';
  const targetSlug = slug || 'fallback';
  const resolvedLabel = labelProvided ? label : hadChildren ? undefined : label;
  const resolvedId = idProvided ? id : `${idPrefix}-${targetSlug}`;
  const resolvedTo = toProvided ? to : `${toPrefix}-${targetSlug}`;

  node.type = 'mdxJsxFlowElement';
  node.name = 'AnchorJump';
  if (!idProvided) {
    setAttr(node, 'id', resolvedId);
  }
  if (!toProvided) {
    setAttr(node, 'to', resolvedTo);
  }
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

/**
 * 规范化 AnchorAuto/AnchorJump 节点的所有属性。
 * 处理优先级：手动提供的属性 > section 自动推断 > 默认值
 */
function normalizeAnchorJumpNode(node, {currentSection, currentSlug, autoModeBySection}) {
  const props = {};
  let labelProvided = false;
  let idProvided = false;
  let toProvided = false;
  (node.attributes || []).forEach((attr) => {
    if (attr && attr.name) {
      props[attr.name] = attr.value;
      if (attr.name === 'label') {
        labelProvided = true;
      }
      if (attr.name === 'id') {
        idProvided = true;
      }
      if (attr.name === 'to') {
        toProvided = true;
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
  const id = props.id;
  const to = props.to;

  toAnchorJump({
    node,
    mode,
    slug,
    label,
    labelProvided,
    hadChildren,
    id,
    to,
    idProvided,
    toProvided,
  });
}

/**
 * 将段落中嵌入的 AnchorAuto 提升为块级节点。
 * 如果 AnchorAuto 在 <p> 内部，则需要将段落拆分为多个部分，
 * 让 AnchorAuto 独立成块，否则 React 会报错（块级元素不能放在内联元素中）。
 */
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

/**
 * Docusaurus remark 插件入口。
 * 实现两阶段遍历：
 *   1. 为每个 H3 标题插入 AnchorAuto 节点
 *   2. 将所有 AnchorAuto/AnchorJump 节点规范化为最终属性
 */
module.exports = function anchorAutoPlugin() {
  return (tree) => {
    const {getUniqueSlug} = createSectionSlugger();
    /** H2 section name → {mode, label} 映射，决定锚点的默认行为 */
    const autoModeBySection = {
      经文摘录: {mode: 'excerpt', label: '→ 讲道'},
      讲道正文: {mode: 'sermon', label: '→ 经文'},
    };

    let currentSection = '';
    let currentSlug = '';

    // =================== 第一阶段：插入 AnchorAuto 节点 ===================
      walk(tree, (node, index, parent) => {
        if (node.type === 'heading') {
          const text = getText(node).trim();
          let slug = getUniqueSlug(currentSection, text);

          if (node.depth === 2) {
            currentSection = text; // H2 启动新的 section 作用域
          }

          node.anchorAutoSlug = slug; // 暂存到节点上，供第二阶段使用

          if (node.depth === 3 && parent && Array.isArray(parent.children)) {
            const sectionInfo = autoModeBySection[currentSection] || {mode: 'excerpt', label: '→ 讲道'};
            let skipAuto = false;
            const insertionIndex = index + 1;
            // 检查后续兄弟节点，判断是否需要跳过自动生成
            for (let i = index + 1; i < parent.children.length; i += 1) {
            const sibling = parent.children[i];
            if (sibling.type === 'heading' && sibling.depth <= node.depth) {
              break; // 遇到同级或更高级标题，停止搜索
            }
            if (isSkipAnchorAutoNode(sibling)) {
              parent.children.splice(i, 1); // 移除标记节点
              skipAuto = true;
              break;
            }
            if (isAnchorNode(sibling) || isAnchorJumpNode(sibling) || containsAnchorJump(sibling)) {
              skipAuto = true; // 已有手动锚点，不重复生成
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

    // 将段落内的 AnchorAuto 提升为块级
    normalizeParagraphAnchors(tree);

    // =================== 第二阶段：规范化所有锚点属性 ===================
    currentSection = '';
    currentSlug = '';

      walk(tree, (node) => {
        if (node.type === 'heading') {
          const text = getText(node).trim();
          const slug = node.anchorAutoSlug || getUniqueSlug(currentSection, text);

          if (node.depth === 2) {
            currentSection = text;
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
