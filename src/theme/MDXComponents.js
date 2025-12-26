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
