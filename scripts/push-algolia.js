const fs = require('fs');
const algoliasearch = require('algoliasearch');

const APP_ID = 'IP0MLC3H7D';
const ADMIN_KEY = '583525a14e2ab274486ea7000be33a50';
const INDEX_NAME = 'bible-sermons';

if (!APP_ID || !ADMIN_KEY) {
  console.error('Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY');
  process.exit(1);
}

const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex(INDEX_NAME);

async function run() {
  console.log('Reading static/algolia-records.json...');
  const raw = JSON.parse(
    fs.readFileSync('static/algolia-records.json', 'utf8')
  );

  // 🔑 关键修复点
  const records = Array.isArray(raw)
    ? raw
    : [
        ...(raw.records || []),
        ...(raw.sermons || []),
        ...(raw.bible || []),
      ];

  console.log(`Loaded ${records.length} records`);

  if (!Array.isArray(records)) {
    throw new Error('Records is not an array after normalization');
  }

  console.log(`Replacing all objects in index "${INDEX_NAME}"...`);
  await index.replaceAllObjects(records);

  console.log('Algolia index updated successfully');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
