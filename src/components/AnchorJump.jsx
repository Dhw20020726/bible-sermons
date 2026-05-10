/**
 * @fileoverview 经文 ↔ 讲道 互跳链接组件。
 * 由 anchor-jump 插件在 Markdown 中自动插入，MDXComponents 映射到此组件。
 * 在每个 H3 标题下方渲染一个跳转链接，点击后滚动到对方 section 的对应位置并高亮目标。
 *
 * props:
 * - id: 当前元素的 HTML id
 * - to: 跳转目标的 HTML id
 * - label: 显示文本（默认 "→ 讲道" 或 "→ 经文"）
 * - section: 所属 section 名称
 */

import React, {useCallback} from 'react';
import clsx from 'clsx';
import {highlightAnchorTarget} from '../utils/highlightAnchor';

/**
 * 渲染经文 ↔ 讲道互跳链接。id 为当前锚点，to 为目标锚点，点击后触发滚动+高亮动画。
 */
export default function AnchorJump({id, to, children, className, label, section}) {
  if (!id || !to) {
    return null;
  }
  const sectionDefault =
    section === '经文摘录'
      ? '→ 讲道'
      : section === '讲道正文'
        ? '→ 经文'
        : '→ 跳转';
  const content = label !== undefined ? label : children ?? sectionDefault;

  const highlightTarget = useCallback(() => {
    highlightAnchorTarget(to);
  }, [to]);

  return (
    <span id={id} className={clsx('anchor-jump', className)}>
      <a
        href={`#${to}`}
        className="sermon-link"
        onClick={() => {
          window.requestAnimationFrame(() => highlightTarget());
        }}>
        {content}
      </a>
    </span>
  );
}
