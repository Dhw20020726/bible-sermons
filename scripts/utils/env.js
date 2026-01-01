const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ALGOLIA_FRIENDLY_KEYS = {
  'Application ID': 'ALGOLIA_APP_ID',
  'Search API Key': 'ALGOLIA_SEARCH_API_KEY',
  'Write API Key': 'ALGOLIA_WRITE_API_KEY',
  'Admin API Key': 'ALGOLIA_ADMIN_API_KEY',
  'Usage API Key': 'ALGOLIA_USAGE_API_KEY',
  'Monitoring API Key': 'ALGOLIA_MONITORING_API_KEY',
};

function hydrateAlgoliaEnv(customEnvPath) {
  const rootPath = path.join(__dirname, '..', '..');
  const envPath = customEnvPath || path.join(rootPath, '.env');

  dotenv.config({path: envPath});

  if (!fs.existsSync(envPath)) {
    return;
  }

  const rawEnv = fs.readFileSync(envPath, 'utf8');
  rawEnv.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#') || !line.includes(':')) {
      return;
    }

    const [friendlyKey, ...valueParts] = line.split(':');
    const trimmedKey = friendlyKey.trim();
    const mappedKey = ALGOLIA_FRIENDLY_KEYS[trimmedKey];
    const value = valueParts.join(':').trim();

    if (mappedKey && value && !process.env[mappedKey]) {
      process.env[mappedKey] = value;
    }
  });
}

function resolveAlgoliaEnv(options = {}) {
  hydrateAlgoliaEnv(options.envPath);

  const appId = process.env.ALGOLIA_APP_ID;
  const indexName = process.env.ALGOLIA_INDEX_NAME || 'bible-sermons';
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_WRITE_API_KEY;
  const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_WRITE_API_KEY;

  if (options.requireAdmin && (!appId || !adminApiKey)) {
    throw new Error('缺少 Algolia Admin/Write 权限的凭证，无法上传索引。');
  }

  return {appId, indexName, searchApiKey, adminApiKey};
}

module.exports = {
  hydrateAlgoliaEnv,
  resolveAlgoliaEnv,
};
