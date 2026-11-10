const items = require('./data/items.js');

App({
  globalData: {
    siteName: '复旦 JADE · AI 安全观察',
    updatedAt: items.meta.updatedAt,
    total: items.meta.total,
    pendingFilter: null,
  },
});
