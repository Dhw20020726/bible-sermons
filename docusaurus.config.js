/**
 * @fileoverview Docusaurus 主配置文件。
 * 定义站点元信息、主题、插件、导航栏、搜索等所有全局设置。
 * Docusaurus 启动/build 时首先读取此文件，是整个站点的"入口配置"。
 *
 * 关键配置项：
 * - presets: 使用 classic 预设，注册了 remark 插件处理 Markdown
 * - themeConfig.algolia: Algolia DocSearch 搜索配置
 * - themeConfig.navbar: 顶部导航栏
 *
 * @see https://docusaurus.io/docs/configuration
 */

const { themes } = require('prism-react-renderer');
const { hydrateAlgoliaEnv, resolveAlgoliaEnv } = require('./scripts/utils/env');

/** 将 .env 中的 Algolia 配置注入 process.env */
hydrateAlgoliaEnv();
const algoliaEnv = resolveAlgoliaEnv();
const isAlgoliaReady = Boolean(algoliaEnv.appId && algoliaEnv.searchApiKey && algoliaEnv.indexName);

const lightCodeTheme = themes.github;

/** @type {import('@docusaurus/types').Config} */
const siteBaseUrl = '/bible-sermons/';

const config = {
  title: '我的圣经笔记',
  tagline: '',
  url: 'https://dhw20020726.github.io',
  baseUrl: siteBaseUrl,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  organizationName: 'Dhw20020726',
  projectName: 'bible-sermons',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // ======================== 预设（Presets） ========================
  // classic 预设提供文档(docs)、主题(theme)等一体化配置
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        // -------- 文档插件配置 --------
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/docs',
          editUrl: undefined,
          beforeDefaultRemarkPlugins: [require('./plugins/heading-anchors')],
          remarkPlugins: [
            require('./plugins/auto-bible'),
            require('./plugins/bible-embed'),
          ],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  plugins: [
  ],

  // ======================== 主题配置 ========================
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      algolia: isAlgoliaReady ? {
        appId: algoliaEnv.appId,
        apiKey: algoliaEnv.searchApiKey,
        indexName: algoliaEnv.indexName,
        contextualSearch: true,
        searchParameters: {
          // DocSearch 默认每次搜索请求用 snippetLength=15 截断摘要（覆盖索引设置），
          // 这里显式加大 content 摘要长度，让结果前后文更长。
          attributesToSnippet: [
            'content:30',
            'hierarchy.lvl1:20',
            'hierarchy.lvl2:40',
            'hierarchy.lvl3:40',
            'hierarchy.lvl4:40',
            'hierarchy.lvl5:40',
            'hierarchy.lvl6:40',
          ],
        },
      } : undefined,
      navbar: {
        title: '我的圣经笔记',
        // logo: {
        //   alt: '..',
        //   src: '..',
        // },
        // 不再随滚动隐藏导航栏，保持顶部横幅始终可见。
        hideOnScroll: false,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      prism: {
        theme: lightCodeTheme,
      },
    }),
};

module.exports = config;
