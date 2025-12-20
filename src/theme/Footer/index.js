import React from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';

export default function Footer() {
  const {footer} = useThemeConfig();

  return (
    <footer className="footer footer--dark">
      <div className="footer__inner">
        <div className="footer__about">
          <h2>关于我们</h2>
          <p>
            我们致力于以圣经为中心的讲道与灵修分享，盼望帮助弟兄姊妹在真道上扎根，
            在生活中经历主的恩典。
          </p>
          <p>如需联系或获取更多资源，请访问各卷书内容或相关资料区。</p>
        </div>
        <div className="footer__divider" role="separator" />
        {footer?.copyright ? (
          <div className="footer__copyright">{footer.copyright}</div>
        ) : null}
      </div>
    </footer>
  );
}
