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
            我们致力于以圣经为中心的讲道与灵修分享，盼望你能在这里认识神，认识那位又真又活的主。
          </p>
          <p><a href="https://ebible.org/pdf/cmn-cu89s/" 
                target="_blank"
                rel="noopener noreferrer">圣经资源下载</a>
          </p>
        </div>
        <div className="footer__divider" role="separator" />
        {footer?.copyright ? (
          <div className="footer__copyright">{footer.copyright}</div>
        ) : null}
      </div>
    </footer>
  );
}
