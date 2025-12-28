import React, {useCallback} from 'react';
import clsx from 'clsx';
import {highlightAnchorTarget} from '../utils/highlightAnchor';

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
