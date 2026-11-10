// 由 scripts/build-pages.mjs 生成，请修改 templates/feed.wxml 与 utils/feed.js
// 模块加载失败时也注册一个可见的错误态页面，避免整页空白。
function fallbackPage(message) {
  return {
    data: {
      updatedAt: '2026-11-10',
      total: 103,
      q: '',
      topicList: [],
      filterOpen: false,
      filterHint: '筛选',
      unread: false,
      cards: [],
      count: 0,
      resultText: '0 条',
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
  config = feed.create('research', '研究披露');
} catch (error) {
  config = fallbackPage('数据模块加载失败：' + (error && error.message ? error.message : String(error)));
}

Page(config);
