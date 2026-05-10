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
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const siteBaseUrl = '/bible-sermons/';

const config = {
  title: 'Bible Sermons',
  tagline: '以圣经为中心分享神的话语与教会讲道',
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
          beforeDefaultRemarkPlugins: [require('./plugins/anchor-jump'), require('./plugins/heading-anchors')],
          remarkPlugins: [require('./plugins/bible-embed')],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: `${siteBaseUrl}img/apple-touch-icon.png`,
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${siteBaseUrl}img/logo-light.svg`,
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: `${siteBaseUrl}img/logo-dark.svg`,
        media: '(prefers-color-scheme: dark)',
      },
    },
  ],

  plugins: [
  ],

  // ======================== 主题配置 ========================
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: isAlgoliaReady ? {
        appId: algoliaEnv.appId,
        apiKey: algoliaEnv.searchApiKey,
        indexName: algoliaEnv.indexName,
        contextualSearch: true,
        searchParameters: {},
      } : undefined,
      navbar: {
        title: 'Bible Sermons',
        logo: {
          alt: 'Bible Sermons Logo',
          src: 'img/logo-light.svg',
          srcDark: 'img/logo-dark.svg',
        },
        hideOnScroll: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
