const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
let cachedPipeline;

async function loadPipeline(siteDir) {
  if (!cachedPipeline) {
    const modulePath = path.join(siteDir, 'src/search/pipeline.js');
    cachedPipeline = import(pathToFileURL(modulePath).href);
  }
  return cachedPipeline;
}

function readDocFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return readDocFiles(fullPath);
    }
    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      return [fullPath];
    }
    return [];
  });
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) {
    return { data: {}, body: raw };
  }
  const closing = raw.indexOf('\n---', 3);
  if (closing === -1) {
    return { data: {}, body: raw };
  }
  const frontmatterBlock = raw.slice(3, closing).trim();
  const data = {};
  frontmatterBlock.split(/\r?\n/).forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (!key) return;
    data[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  });
  const body = raw.slice(closing + 4);
  return { data, body };
}

function createRecord(field, text, heading, baseMeta, utils) {
  const sectionId = heading.anchor || 'root';
  const lang = utils.detectLanguage(text);
  const sequence = baseMeta.nextId ? baseMeta.nextId() : 0;
  return {
    id: `${baseMeta.docId}#${sectionId}:${field}:${sequence}`,
    docId: baseMeta.docId,
    sectionId,
    field,
    anchor: heading.anchor,
    breadcrumb: [...baseMeta.breadcrumb, heading.text || baseMeta.title].filter(
      Boolean,
    ),
    lang,
    snippetSource: text.trim().slice(0, 320),
    level: heading.level,
    url: `${baseMeta.baseUrl}${heading.anchor ? `#${heading.anchor}` : ''}`,
    title: heading.text || baseMeta.title,
    [field]: text,
  };
}

function extractDocuments(filePath, docsRoot, utils) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const relativePath = path.relative(docsRoot, filePath).replace(/\\/g, '/');
  const docIdRaw = relativePath.replace(/\.mdx?$/i, '');
  const docId = docIdRaw.replace(/\/index$/i, '') || 'index';
  const baseUrl = `/docs/${docId}`;
  const breadcrumb = docId.split('/').filter(Boolean);
  const slugger = utils.createSlugger();
  const records = [];
  const headingStack = [{ text: data.title || '', anchor: '', level: 1 }];
  const counter = { value: 0 };
  const nextId = () => {
    counter.value += 1;
    return counter.value;
  };

  const summary = data.summary || data.description;
  const initialHeading = headingStack[0];
  const meta = {
    baseUrl,
    breadcrumb,
    docId,
    title:
      data.title ||
      breadcrumb[breadcrumb.length - 1] ||
      path.basename(filePath, path.extname(filePath)),
    nextId,
  };
  records.push(
    createRecord('title', meta.title, initialHeading, { ...meta, breadcrumb }, utils),
  );
  if (summary) {
    records.push(
      createRecord(
        'summary',
        summary,
        { text: meta.title, anchor: 'summary', level: 1 },
        { ...meta, breadcrumb },
        utils,
      ),
    );
  }

  const lines = body.split(/\r?\n/);
  let inFence = false;
  const buffer = [];

  const flushParagraph = () => {
    if (buffer.length === 0) return;
    const paragraph = buffer.join(' ').trim();
    buffer.length = 0;
    if (!paragraph) return;
    const currentHeading = headingStack[headingStack.length - 1];
    records.push(createRecord('content', paragraph, currentHeading, meta, utils));
    if (/[\u4e00-\u9fffA-Za-z]+\s*\d+[:：]\d+/.test(paragraph)) {
      records.push(
        createRecord('scripture', paragraph, currentHeading, meta, utils),
      );
    }
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```/);
    if (fenceMatch) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const depth = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const anchor = slugger(headingText);
      const heading = { text: headingText, anchor, level: depth };
      while (headingStack.length > depth) {
        headingStack.pop();
      }
      headingStack.push(heading);
      records.push(createRecord('headings', headingText, heading, meta, utils));
      continue;
    }

    const blockMatch = line.match(/^\s*>\s*(.+)$/);
    const effectiveLine = blockMatch ? blockMatch[1] : line;
    if (effectiveLine.trim() === '') {
      flushParagraph();
      continue;
    }
    buffer.push(effectiveLine.trim());
  }
  flushParagraph();
  return records;
}

async function createMiniSearch(siteDir, utils) {
  const modulePath = path.join(
    siteDir,
    'packages/search-engine/minisearch/index.js',
  );
  const MiniSearchModule = await import(pathToFileURL(modulePath).href);
  const MiniSearch = MiniSearchModule.default || MiniSearchModule.MiniSearch;
  return new MiniSearch({
    ...utils.defaultSearchOptions,
    tokenize: (text) => utils.tokenizeText(text).tokens,
    processTerm: (term) => utils.normalizeText(term),
  });
}

module.exports = function bilingualSearchPlugin(context) {
  const docsRoot = path.join(context.siteDir, 'docs');
  const pipelinePromise = loadPipeline(context.siteDir);
  return {
    name: 'bilingual-bible-search',
    async loadContent() {
      if (!fs.existsSync(docsRoot)) {
        return { documents: [], utils: await pipelinePromise };
      }
      const utils = await pipelinePromise;
      const files = readDocFiles(docsRoot);
      const documents = files.flatMap((file) =>
        extractDocuments(file, docsRoot, utils),
      );
      return { documents, utils };
    },
    async contentLoaded({ content }) {
      if (!content || !content.documents) {
        return;
      }
      const utils = content.utils || (await pipelinePromise);
      const miniSearch = await createMiniSearch(context.siteDir, utils);
      miniSearch.addAll(content.documents);
      const payload = {
        index: miniSearch.toJSON(),
        options: utils.defaultSearchOptions,
        metadata: {
          generatedAt: new Date().toISOString(),
          docCount: content.documents.length,
        },
      };
      const targetDir = path.join(context.siteDir, 'static', 'search');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, 'index.json'),
        JSON.stringify(payload),
      );
    },
  };
};
