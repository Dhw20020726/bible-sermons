#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { resolveAlgoliaConfig } = require('./utils/env');

const ROOT_DIR = path.join(__dirname, '..');
const INDEX_FILE = path.join(ROOT_DIR, 'build', 'algolia', 'index.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAlgolia(appId, apiKey, apiPath, options = {}) {
  const url = `https://${appId}-dsn.algolia.net${apiPath}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-API-Key': apiKey,
      'X-Algolia-Application-Id': appId,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Algolia request failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function waitForTask(appId, apiKey, indexName, taskID) {
  if (!taskID) return;
  const taskPath = `/1/indexes/${encodeURIComponent(indexName)}/task/${taskID}`;

  while (true) {
    const status = await callAlgolia(appId, apiKey, taskPath, { method: 'GET' });
    if (status.status === 'published') return;
    await sleep(1500);
  }
}

async function uploadRecords(records, { appId, adminKey, indexName }) {
  console.log(`Clearing existing objects in index "${indexName}"...`);
  const clearResult = await callAlgolia(
    appId,
    adminKey,
    `/1/indexes/${encodeURIComponent(indexName)}/clear`,
    { method: 'POST', body: '{}' },
  );
  await waitForTask(appId, adminKey, indexName, clearResult.taskID);

  console.log(`Uploading ${records.length} records to Algolia index "${indexName}"...`);
  const batchSize = 900;
  for (let start = 0; start < records.length; start += batchSize) {
    const slice = records.slice(start, start + batchSize);
    const batchPayload = {
      requests: slice.map((record) => ({
        action: 'addObject',
        body: record,
      })),
    };

    const result = await callAlgolia(
      appId,
      adminKey,
      `/1/indexes/${encodeURIComponent(indexName)}/batch`,
      { method: 'POST', body: JSON.stringify(batchPayload) },
    );
    await waitForTask(appId, adminKey, indexName, result.taskID);
    console.log(`Uploaded ${Math.min(start + batchSize, records.length)}/${records.length} records`);
  }
}

async function main() {
  const { appId, adminKey, indexName } = resolveAlgoliaConfig();
  if (!appId || !adminKey || !indexName) {
    console.error('Missing Algolia configuration. Please set ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, and ALGOLIA_INDEX_NAME.');
    process.exit(1);
  }

  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Index file not found at ${INDEX_FILE}. Run "npm run algolia:generate" first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INDEX_FILE, 'utf8');
  const records = JSON.parse(raw);

  try {
    await uploadRecords(records, { appId, adminKey, indexName });
    console.log('Algolia index upload finished.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
