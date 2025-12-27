const path = require('path');
const {buildBookIndex, loadChapterLines} = require('../plugins/bible-embed');

const baseDir = path.join(process.cwd(), 'static', 'bible');
const version = process.env.BIBLE_VERSION || 'cmn-cu89s_readaloud';

const mapping = buildBookIndex(baseDir, version);
const bookCount = mapping.size;

if (bookCount !== 66) {
  throw new Error(`卷书数量应为 66，本次检索到 ${bookCount}`);
}

const failures = [];
for (const book of mapping.keys()) {
  try {
    const lines = loadChapterLines(baseDir, version, mapping, book, 1);
    if (!lines[2]) {
      failures.push(`${book}: 第 1 章第 1 节未找到内容`);
    }
  } catch (error) {
    failures.push(`${book}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('以下卷书占位符存在问题：');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('66 本卷书的占位符均可正常解析。');
}
