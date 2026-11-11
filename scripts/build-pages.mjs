#!/usr/bin/env node
// 把 templates/feed.{wxml,wxss} 内联进三个列表页，并生成带兜底的页面 JS。
// 原因：部分 H5 预览器不展开 WXML <include> 与 WXSS @import，页面会整页空白。
// 模板仍是唯一源，改完模板或数据后运行：node scripts/build-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const meta = require(path.join(root, 'data/items.js')).meta;

const wxml = fs.readFileSync(path.join(root, 'templates/feed.wxml'), 'utf8');
const wxss = fs.readFileSync(path.join(root, 'templates/feed.wxss'), 'utf8');

const pages = [
  { dir: 'pages/index', name: 'index', view: 'feed', title: '最新情报' },
  { dir: 'pages/incidents', name: 'incidents', view: 'incidents', title: '真实事件' },
  { dir: 'pages/research', name: 'research', view: 'research', title: '研究披露' },
];

function pageJs(view, title) {
  return `// 由 scripts/build-pages.mjs 生成，请修改 templates/feed.wxml 与 utils/feed.js
// 模块加载失败时也注册一个可见的错误态页面，避免整页空白。
function fallbackPage(message) {
  return {
    data: {
      updatedAt: '${meta.updatedAt}',
      total: ${meta.total},
      q: '',
      topicList: [],
      filterOpen: false,
      filterHint: '筛选',
      filterActive: false,
      unread: false,
      cards: [],
      count: 0,
      resultText: '0 条结果',
      loading: false,
      ready: false,
      emptyState: false,
      errorState: true,
      errorText: message,
      sourceLabels: [],
      evidenceLabels: [],
      periodLabels: [],
      assessmentLabels: [],
      sortLabels: [],
    },
    onLoad() {},
  };
}

let config;
try {
  const feed = require('../../utils/feed.js');
  config = feed.create('${view}', '${title}');
} catch (error) {
  config = fallbackPage('数据模块加载失败：' + (error && error.message ? error.message : String(error)));
}

Page(config);
`;
}

for (const page of pages) {
  const dir = path.join(root, page.dir);
  fs.writeFileSync(path.join(dir, page.name + '.wxml'), wxml);
  fs.writeFileSync(path.join(dir, page.name + '.wxss'), wxss);
  fs.writeFileSync(path.join(dir, page.name + '.js'), pageJs(page.view, page.title));
  console.log('generated ' + page.dir);
}
