/**
 * @fileoverview Algolia 环境变量加载工具。
 *
 * .env 文件使用可读键名（如 "Application ID: xxx"），
 * 本模块将其映射为标准环境变量名（ALGOLIA_APP_ID 等）。
 *
 * hydrateAlgoliaEnv() 在 docusaurus.config.js 和 algoliaIndex.js 启动时调用。
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/** 可读键名 → 标准环境变量名映射表 */
const ALGOLIA_FRIENDLY_KEYS = {
  'Application ID': 'ALGOLIA_APP_ID',
  'Search API Key': 'ALGOLIA_SEARCH_API_KEY',
  'Write API Key': 'ALGOLIA_WRITE_API_KEY',
  'Admin API Key': 'ALGOLIA_ADMIN_API_KEY',
  'Usage API Key': 'ALGOLIA_USAGE_API_KEY',
  'Monitoring API Key': 'ALGOLIA_MONITORING_API_KEY',
  'Index Name': 'ALGOLIA_INDEX_NAME',
};

/**
 * 读取项目根目录的 .env 文件，将 Algolia 相关配置注入 process.env。
 * 只在 process.env 中没有对应值时才设置（已设置的不覆盖）。
 */
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

/**
 * 从 process.env 解析 Algolia 配置。
 * @param {{envPath?: string, requireAdmin?: boolean, requireSearch?: boolean}} options
 * @returns {{appId: string, indexName: string, searchApiKey: string, adminApiKey: string}}
 */
function resolveAlgoliaEnv(options = {}) {
  hydrateAlgoliaEnv(options.envPath);

  const appId = process.env.ALGOLIA_APP_ID;
  const indexName = (process.env.ALGOLIA_INDEX_NAME || '').trim() || 'bible-sermons';
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_WRITE_API_KEY;
  const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_WRITE_API_KEY;

  if (options.requireAdmin && (!appId || !adminApiKey)) {
    throw new Error('缺少 Algolia Admin/Write 权限的凭证，无法上传索引。');
  }
  if (options.requireSearch && (!appId || !searchApiKey || !indexName)) {
    throw new Error('缺少 Algolia 搜索所需的 appId、apiKey 或 indexName。');
  }

  return {appId, indexName, searchApiKey, adminApiKey};
}

module.exports = {
  hydrateAlgoliaEnv,
  resolveAlgoliaEnv,
};
