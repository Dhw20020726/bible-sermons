/**
 * @fileoverview 站点首页组件。
 * 极简首页：只提供「从创世记开始阅读」与「继续上次阅读」两个入口。
 */

import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  const [lastReadPath, setLastReadPath] = useState('/docs');
  const [lastReadTitle, setLastReadTitle] = useState('继续上次阅读');
  const [hasLastRead, setHasLastRead] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
      description="个人圣经讲道笔记"
      wrapperClassName="navbar--home"
    >
      <main className="homeLayout">
        <section className="homeHero">
          <div className="homeHeroContent">
            <div className="homeHeroVerse">
              <div>
                <h1>我的圣经笔记</h1>
                <h2>约翰福音 1:18</h2>
                <p>从来没有人看见　神，只有在父怀里的独生子将他表明出来。</p>
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
