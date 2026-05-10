/**
 * @fileoverview 自定义 MDX 组件映射。
 * 扩展 Docusaurus 默认的 Markdown→React 组件映射表，添加自定义组件：
 * - AnchorJump：经文/讲道互跳链接（由 anchor-jump 插件生成）
 * - AnchorAuto：空壳占位（remark 插件未及时替换时的安全兜底）
 */

import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import AnchorJump from '../components/AnchorJump';
// AnchorAuto 会在 remark 阶段被替换为 AnchorJump，这里提供一个空壳避免渲染出错
function AnchorAuto() {
  return null;
}

export default {
  ...MDXComponents,
  AnchorJump,
  AnchorAuto,
};
