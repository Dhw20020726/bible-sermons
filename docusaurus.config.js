const { themes } = require('prism-react-renderer');
const { hydrateAlgoliaEnv, resolveAlgoliaEnv } = require('./scripts/utils/env');

hydrateAlgoliaEnv();
const algoliaEnv = resolveAlgoliaEnv();
const isAlgoliaReady = Boolean(algoliaEnv.appId && algoliaEnv.searchApiKey && algoliaEnv.indexName);

const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '圣经讲道与灵修分享',
  tagline: '按卷书系统性分享神的话语与教会讲道',
  url: 'https://Dhw20020726.github.io',
  baseUrl: '/bible-sermons/',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',
  organizationName: 'Dhw20020726',
  projectName: 'bible-sermons',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/docs',
          editUrl: undefined,
          beforeDefaultRemarkPlugins: [require('./plugins/anchor-auto'), require('./plugins/slug-normalize')],
          remarkPlugins: [require('./plugins/bible-embed')],
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
        title: '主页->',
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
