const { themes } = require('prism-react-renderer');
const algoliaConfig = {
  appId: 'IP0MLC3H7D',
  apiKey: '66b5902b2bede0c671fb5b2343a7cebc',
  indexName: 'bible-sermons',
  contextualSearch: true,
  searchParameters: {},
};

const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const siteBaseUrl = '/bible-sermons/';

const config = {
  title: 'Bible Sermons',
  tagline: '以圣经为中心分享神的话语与教会讲道',
  url: 'https://Dhw20020726.github.io',
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

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: algoliaConfig,
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
