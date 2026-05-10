/**
 * @fileoverview 文档详情页 wrapper。
 * 包装 Docusaurus 默认的 DocItem，在每次文档页面加载时
 * 将当前文档的 permalink 和 title 存入 localStorage，
 * 供首页"继续上次阅读"按钮使用。
 */

import React, {useEffect} from 'react';
import DocItem from '@theme-original/DocItem';
import {useLocation} from '@docusaurus/router';

export default function DocItemWrapper(props) {
  const metadata = props?.content?.metadata;
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const path = metadata?.permalink || location.pathname;
    if (path) {
      window.localStorage.setItem('lastReadDocPath', path);
    }
    if (metadata?.title) {
      window.localStorage.setItem('lastReadDocTitle', metadata.title);
    }
  }, [metadata?.permalink, metadata?.title, location.pathname]);

  return <DocItem {...props} />;
}
