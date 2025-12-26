import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import AnchorJump from '../components/AnchorJump';
// AnchorAuto 会在 remark 阶段被替换为 AnchorJump，此处注册一个空壳避免意外渲染时出错
function AnchorAuto() {
  return null;
}

export default {
  ...MDXComponents,
  AnchorJump,
  AnchorAuto,
};
