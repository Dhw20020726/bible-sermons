import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import ContactDrawer from '../../components/ContactDrawer';

export default function Footer() {
  const {siteConfig} = useDocusaurusContext();
  const [open, setOpen] = useState(false);
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__about">
          <h2>与我们联系</h2>
          <p>
            {siteConfig.tagline || '以圣经为中心分享神的话语与教会讲道。'}
            若有反馈、见证或祷告需求，欢迎随时留言。
          </p>
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            Write message
          </button>
        </div>

        <div className="footer__divider" />

        <div className="footer__copyright">
          © {year} Bible Sermons. 感谢你的同行与代祷。
        </div>
      </div>

      <ContactDrawer open={open} onClose={() => setOpen(false)} />
    </footer>
  );
}
