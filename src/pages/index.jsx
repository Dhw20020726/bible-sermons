/**
 * @fileoverview 站点首页组件。
 * 渲染 hero 区域（网站 logo 呼吸闪烁 + 经文金句）、"从创世记开始阅读"按钮、
 * 以及"继续上次阅读"按钮（从 localStorage 读取上次访问的文档路径）。
 */

import React, {useEffect, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  const [lastReadPath, setLastReadPath] = useState('/docs');
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');
  const [hasLastRead, setHasLastRead] = useState(false);
  const logoUrl = useBaseUrl('/img/logo-light.svg');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedPath = window.localStorage.getItem('lastReadDocPath');
    const savedTitle = window.localStorage.getItem('lastReadDocTitle');
    if (savedPath) {
      setLastReadPath(savedPath);
      setHasLastRead(true);
    }
    if (savedTitle) {
      setLastReadTitle(`继续阅读：${savedTitle}`);
    }
  }, []);

  return (
    <Layout
      description="以圣经为中心分享神的话语与教会讲道"
      wrapperClassName="navbar--home"
    >
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <img
              className="homeLogo"
              src={logoUrl}
              alt="Bible Sermons"
              width={120}
              height={120}
            />
            <div className="homeHeroVerse">
              <div>
                <h1>约翰福音 1:18</h1>
                <h2>
                  从来没有人看见　神，只有在父怀里的独生子将他表明出来。
                </h2>
              </div>
            </div>
            <div className="homeHeroActions">
              <Link className="button homePrimaryButton" to="/docs/category/创世记">
                从创世记开始阅读
              </Link>
              {hasLastRead && (
                <Link className="button homeSecondaryButton" to={lastReadPath}>
                  {lastReadTitle}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
