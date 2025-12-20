const fs = require('fs');
const path = require('path');

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

const sortByName = (a, b) => a.name.localeCompare(b.name, SORT_LOCALE);

const isDocFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return ext === '.md' || ext === '.mdx';
};

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
      };

      if (items.length === 0) {
        category.link = {
          type: 'generated-index',
          title: book,
          description: `${book} 暂无内容`,
        };
      }

      return category;
    });
};

module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: '旧约',
      collapsed: true,
      link: {
        type: 'generated-index',
        title: '旧约',
        description: '旧约暂时没有内容。',
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
        description: '新约暂时没有内容。',
      },
      items: buildTestamentItems('new-testament'),
    },
  ],
};
