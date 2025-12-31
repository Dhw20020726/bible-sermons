const {themes} = require('prism-react-renderer');

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
          beforeDefaultRemarkPlugins: [require('./plugins/anchor-auto')],
          remarkPlugins: [require('./plugins/bible-embed')],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: '圣经讲道与灵修分享',
        items: [
          {to: '/', label: '首页', position: 'left'},
          {to: '/docs', label: '目录', position: 'left'},
          {type: 'search', position: 'right'},
        ],
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      algolia: {
        // 使用环境变量优先；若未设置，用占位符保证构建阶段通过校验（部署时请提供真实值）
        appId: 'IP0MLC3H7D',
        apiKey: '66b5902b2bede0c671fb5b2343a7cebc',
        indexName: 'bible-sermons',
        contextualSearch: false,
        searchPagePath: undefined,
      },
      footer: {
        style: 'dark',
        copyright: `© ${new Date().getFullYear()} 圣经讲道与灵修分享`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
