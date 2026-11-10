// 本地数据入口：全部资料来自 scripts/sync-data.mjs 生成的 data/*.js
const itemsData = require('../data/items.js');
const sourcesData = require('../data/sources.js');
const briefingsData = require('../data/briefings.js');
const coverageData = require('../data/risk-coverage.js');

const items = itemsData.items;
const meta = itemsData.meta;
const sources = sourcesData;
const briefings = briefingsData;
const coverage = coverageData;
const READ_KEY = 'ai-security-observer:miniprogram:read:v1';

function loadRead() {
  try {
    const value = wx.getStorageSync(READ_KEY);
    return new Set(Array.isArray(value) ? value : []);
  } catch (error) {
    return new Set();
  }
}

function rememberRead(id) {
  const read = loadRead();
  if (read.has(id)) return;
  read.add(id);
  try {
    wx.setStorageSync(READ_KEY, Array.from(read));
  } catch (error) {
    // 存储不可用时不影响阅读
  }
}

const sourceNames = {
  anthropic: 'Anthropic', openai: 'OpenAI', microsoft: 'Microsoft Security',
  trail: 'Trail of Bits', unit42: 'Unit 42', checkpoint: 'Check Point',
  embrace: 'Embrace The Red', pillar: 'Pillar Security', zenity: 'Zenity Labs',
  aws: 'AWS Security', pdf: 'AI事鉴 · PDF', github: 'GitHub Advisories', seebug: 'Seebug',
};

function sourceLabel(source) {
  return sourceNames[source.id] || source.shortName || source.name;
}

function viewItems(view) {
  return items.filter(item =>
    view === 'incidents' ? item.kind === 'incident' :
    view === 'research' ? item.kind !== 'incident' : true);
}

function usedSources(view) {
  const data = viewItems(view);
  return sources
    .filter(source => source.id !== 'pdf')
    .map(source => ({
      id: source.id,
      label: sourceLabel(source),
      count: data.filter(item => item.sourceId === source.id).length,
    }))
    .filter(source => source.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function formatDate(value) {
  return value ? value.slice(0, 10).replace(/-/g, '.') : '未披露';
}

function shortDate(value) {
  if (!value) return '未披露';
  return `${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日`;
}

function hostname(url) {
  const match = /^https?:\/\/([^/?#]+)/.exec(url || '');
  return match ? match[1] : '外部来源';
}

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : '';
}

function copyText(text, label) {
  if (!text) {
    wx.showToast({ title: '暂无可复制内容', icon: 'none' });
    return;
  }
  wx.setClipboardData({
    data: text,
    success: () => wx.showToast({ title: label || '已复制', icon: 'none' }),
    fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
  });
}

module.exports = {
  items, meta, sources, briefings, coverage,
  loadRead, rememberRead, sourceLabel, viewItems, usedSources,
  formatDate, shortDate, hostname, safeUrl, copyText,
};
