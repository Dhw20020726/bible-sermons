import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  return (
    <Layout title="圣经讲道与灵修分享" description="按卷书系统性分享神的话语与教会讲道">
      <main style={{ padding: '4rem 1.5rem', maxWidth: '960px', margin: '0 auto' }}>
        <h1 style={{ fontWeight: 600, marginBottom: '1rem' }}>圣经讲道与灵修分享</h1>
        <p style={{ lineHeight: 1.9, color: '#3a3a3a' }}>
          在这安静的空间里，我们按圣经卷书系统性地分享神的话语与教会讲道，
          盼望每一次阅读都成为敬拜与生命更新的起点。
        </p>
        <p style={{ lineHeight: 1.9, color: '#3a3a3a' }}>
          请从旧约或新约开始，按卷书缓缓前行，让经文引导你看见主的信实与恩典。
        </p>
        <Link
          className="button button--primary"
          to="/docs/old-testament/创世记/introduction"
        >
          从创世记开始阅读
        </Link>
      </main>
    </Layout>
  );
}
