const store = require('../../utils/data.js');

Page({
  data: {
    updatedAt: store.meta.updatedAt,
    total: store.meta.total,
    version: store.meta.version,
    scored: store.coverage.statuses.scored,
    withCve: store.coverage.withCve,
  },

  goRules() {
    wx.navigateTo({ url: '/pages/risk-rules/risk-rules' });
  },

  copyMail() {
    store.copyText('mi_zhang@fudan.edu.cn', '邮箱已复制');
  },

  onShareAppMessage() {
    return { title: '复旦 JADE · AI 威胁情报站', path: '/pages/index/index' };
  },
});
