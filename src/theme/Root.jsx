/**
 * @fileoverview Docusaurus 主题根组件（最外层 wrapper）。
 * 监听 URL hash 变化，当页面加载带 #anchor 的链接时，
 * 自动滚动到目标元素并触发高亮动画（通过 highlightAnchorTarget）。
 * 所有页面的 UI 都在此组件内渲染。
 */

import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import {highlightAnchorTarget} from '../utils/highlightAnchor';

export default function Root({children}) {
  const {hash} = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    window.requestAnimationFrame(() => {
      highlightAnchorTarget(id);
    });
  }, [hash]);

  return <>{children}</>;
}
