#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const algoliasearch = require('algoliasearch');
const {resolveAlgoliaEnv} = require('./utils/env');

function readIndexFile() {
  const indexPath = path.join(__dirname, '..', 'build', 'algolia-index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error('未找到 build/algolia-index.json，请先运行 npm run index:generate');
  }
  const raw = fs.readFileSync(indexPath, 'utf8');
  return JSON.parse(raw);
}

async function uploadIndex() {
  const {appId, adminApiKey, indexName} = resolveAlgoliaEnv({requireAdmin: true, requireSearch: true});
  const records = readIndexFile();

  const client = algoliasearch(appId, adminApiKey);
  const index = client.initIndex(indexName);

  console.log(`准备上传 ${records.length} 条记录到 Algolia 索引 ${indexName} ...`);

  await index.replaceAllObjects(records, {safe: true});
  await index.setSettings({
    searchableAttributes: ['hierarchy.lvl0', 'hierarchy.lvl1', 'title', 'headings', 'summary', 'content'],
    attributesToSnippet: ['summary:50', 'content:25'],
    attributesForFaceting: ['filterOnly(tags)', 'filterOnly(category)'],
  });

  console.log('索引上传完成');
}

uploadIndex().catch((error) => {
  console.error('上传 Algolia 索引失败：', error.message);
  process.exit(1);
});
