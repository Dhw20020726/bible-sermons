/**
 * @fileoverview Docusaurus 侧边栏配置。
 * 自动扫描 docs/ 下的旧约/新约目录，按圣经卷书顺序生成可折叠的侧边栏导航。
 * 每卷书作为一个 category，其中的 .md 文件作为条目，按中文拼音排序。
 */

const fs = require('fs');
const path = require('path');

/** 圣经卷书顺序：旧约 39 卷 + 新约 27 卷，按正典顺序排列 */
const BOOK_ORDER = {
  'old-testament': [
    '创世记',
    '出埃及记',
    '利未记',
    '民数记',
    '申命记',
    '约书亚记',
    '士师记',
    '路得记',
    '撒母耳记上',
    '撒母耳记下',
    '列王纪上',
    '列王纪下',
    '历代志上',
    '历代志下',
    '以斯拉记',
    '尼希米记',
    '以斯帖记',
    '约伯记',
    '诗篇',
    '箴言',
    '传道书',
    '雅歌',
    '以赛亚书',
    '耶利米书',
    '耶利米哀歌',
    '以西结书',
    '但以理书',
    '何西阿书',
    '约珥书',
    '阿摩司书',
    '俄巴底亚书',
    '约拿书',
    '弥迦书',
    '那鸿书',
    '哈巴谷书',
    '西番雅书',
    '哈该书',
    '撒迦利亚书',
    '玛拉基书',
  ],
  'new-testament': [
    '马太福音',
    '马可福音',
    '路加福音',
    '约翰福音',
    '使徒行传',
    '罗马书',
    '哥林多前书',
    '哥林多后书',
    '加拉太书',
    '以弗所书',
    '腓立比书',
    '歌罗西书',
    '帖撒罗尼迦前书',
    '帖撒罗尼迦后书',
    '提摩太前书',
    '提摩太后书',
    '提多书',
    '腓利门书',
    '希伯来书',
    '雅各书',
    '彼得前书',
    '彼得后书',
    '约翰一书',
    '约翰二书',
    '约翰三书',
    '犹大书',
    '启示录',
  ],
};

const DOCS_DIR = path.join(__dirname, 'docs');
const SORT_LOCALE = 'zh-Hans-CN';

/** 按中文拼音排序目录条目 */
const sortByName = (a, b) =>
  a.name.localeCompare(b.name, SORT_LOCALE, { numeric: true, sensitivity: 'base' });

/** 判断文件名是否为文档文件（.md 或 .mdx） */
const isDocFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return ext === '.md' || ext === '.mdx';
};

/**
 * 递归收集指定目录下所有文档的 Docusaurus ID。
 * @param {string} relativeDir - 相对于 docs/ 的目录路径
 * @returns {string[]} ID 数组，格式为 "old-testament/创世记/讲道标题"
 */
const getDocIdsForDir = (relativeDir) => {
  const absoluteDir = path.join(DOCS_DIR, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true }).sort(sortByName);
  const docIds = [];

  for (const entry of entries) {
    const entryRelativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      docIds.push(...getDocIdsForDir(entryRelativePath));
      continue;
    }

    if (entry.isFile() && isDocFile(entry.name)) {
      docIds.push(entryRelativePath.replace(/\.(md|mdx)$/i, ''));
    }
  }

  return docIds;
};

const formatBookDescription = (book, docCount) => {
  if (docCount === 0) {
    return `${book} 暂无内容`;
  }
  return `${book} 共 ${docCount} 篇讲道`;
};

const formatTestamentDescription = (testamentLabel, bookCount, docCount) => {
  if (docCount === 0) {
    return `${testamentLabel} 共 ${bookCount} 卷书，暂无讲道内容`;
  }
  return `${testamentLabel} 共 ${bookCount} 卷书，${docCount} 篇讲道`;
};

/**
 * 为某个约书（old-testament/new-testament）构建侧边栏 category 列表。
 * @param {string} testamentDir - 约书目录名
 * @returns {Array<{type: 'category', label: string, collapsed: boolean, items: string[]}>}
 */
const buildTestamentItems = (testamentDir) => {
  const bookOrder = BOOK_ORDER[testamentDir] || [];
  return bookOrder
    .filter((book) => fs.existsSync(path.join(DOCS_DIR, testamentDir, book)))
    .map((book) => {
      const items = getDocIdsForDir(path.posix.join(testamentDir, book));
      const category = {
        type: 'category',
        label: book,
        collapsed: true,
        items,
        link: {
          type: 'generated-index',
          title: book,
          description: formatBookDescription(book, items.length),
        },
      };

      return category;
    });
};

/**
 * 统计某个约书的卷书数量和讲道篇数，生成描述文本。
 * @param {string} testamentDir - 约书目录名
 * @param {string} label - 显示标签（"旧约"/"新约"）
 * @returns {{books: string[], docCount: number, description: string}}
 */
const buildTestamentMeta = (testamentDir, label) => {
  const bookOrder = BOOK_ORDER[testamentDir] || [];
  const books = bookOrder.filter((book) =>
    fs.existsSync(path.join(DOCS_DIR, testamentDir, book)),
  );
  const docCount = getDocIdsForDir(testamentDir).length;
  return {
    books,
    docCount,
    description: formatTestamentDescription(label, books.length, docCount),
  };
};

const oldTestamentMeta = buildTestamentMeta('old-testament', '旧约');
const newTestamentMeta = buildTestamentMeta('new-testament', '新约');

module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: '旧约',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: '旧约',
        description: oldTestamentMeta.description,
      },
      items: buildTestamentItems('old-testament'),
    },
    {
      type: 'category',
      label: '新约',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: '新约',
        description: newTestamentMeta.description,
      },
      items: buildTestamentItems('new-testament'),
    },
  ],
};
