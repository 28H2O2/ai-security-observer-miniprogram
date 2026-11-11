// 从相邻网页项目读取构建产物，生成小程序可直接 require 的本地数据模块。
// 用法：node scripts/sync-data.mjs
// 网页项目更新 content/ 后先运行 npm run build，再运行本脚本。
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(root, '..', 'ai-security-observer', 'dist');
const output = path.join(root, 'data');
mkdirSync(output, { recursive: true });
mkdirSync(path.join(root, 'assets'), { recursive: true });

// 小程序站点名与网页项目不同；网页项目保持不动，在生成快照时覆盖 meta.title。
const SITE_TITLE = 'AI 威胁情报站';

const names = ['items', 'sources', 'briefings', 'risk-coverage'];
for (const name of names) {
  const file = path.join(source, 'data', `${name}.json`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (name === 'items' && data.meta) data.meta.title = SITE_TITLE;
  writeFileSync(path.join(output, `${name}.js`), `module.exports = ${JSON.stringify(data)};\n`);
  console.log(`${name}: ${(statSync(path.join(output, `${name}.js`)).size / 1024).toFixed(0)} KB`);
}

copyFileSync(path.join(source, 'assets', 'jade-logo.png'), path.join(root, 'assets', 'jade-logo.png'));
const meta = JSON.parse(readFileSync(path.join(source, 'data', 'items.json'), 'utf8')).meta;
console.log(`snapshot ${meta.updatedAt} · ${meta.total} items · version ${meta.version}`);
