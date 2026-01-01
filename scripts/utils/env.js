const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');

function loadEnvFromFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }

  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const lines = content.split(/\r?\n/);
  const parsed = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const delimiterIndex = line.search(/[:=]/);
    if (delimiterIndex === -1) continue;

    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 1).trim();
    if (!key) continue;

    parsed[key] = value;
  }

  Object.assign(process.env, parsed);
  return parsed;
}

function pickEnvValue(...keys) {
  for (const key of keys) {
    if (!key) continue;
    const normalized = key.replace(/\s+/g, '_');
    const candidates = [
      key,
      key.toUpperCase(),
      normalized,
      normalized.toUpperCase(),
    ];

    for (const candidate of candidates) {
      if (process.env[candidate]) {
        return process.env[candidate];
      }
    }
  }
  return undefined;
}

function resolveAlgoliaConfig() {
  loadEnvFromFile();

  const appId =
    process.env.ALGOLIA_APP_ID ||
    pickEnvValue('Application ID', 'Algolia Application ID');
  const searchKey =
    process.env.ALGOLIA_SEARCH_API_KEY ||
    pickEnvValue('Search API Key', 'Algolia Search API Key');
  const adminKey =
    process.env.ALGOLIA_ADMIN_API_KEY ||
    process.env.ALGOLIA_WRITE_API_KEY ||
    pickEnvValue('Admin API Key', 'Write API Key', 'Algolia Admin API Key');
  const indexName =
    process.env.ALGOLIA_INDEX_NAME ||
    pickEnvValue('Algolia Index Name', 'ALGOLIA_INDEX');

  return { appId, searchKey, adminKey, indexName };
}

module.exports = {
  loadEnvFromFile,
  resolveAlgoliaConfig,
};
