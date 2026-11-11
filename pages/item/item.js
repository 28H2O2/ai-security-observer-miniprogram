const store = require('../../utils/data.js');
const { buildDetail } = require('../../utils/view.js');
const { itemMarkdown } = require('../../utils/publication.js');

Page({
  data: {
    viewState: 'loading',
    detail: null,
  },

  onLoad(options) {
    let id = '';
    try {
      id = decodeURIComponent(options.id || '');
    } catch (error) {
      id = options.id || '';
    }
    const raw = store.items.find(entry => entry.id === id);
    if (!raw) {
      this.setData({ viewState: 'notfound' });
      return;
    }
    store.rememberRead(id);
    this.raw = raw;
    this.setData({ viewState: 'ready', detail: buildDetail(raw) });
    wx.setNavigationBarTitle({ title: '情报详情' });
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: '/pages/index/index' }),
    });
  },

  copyUrl(event) {
    store.copyText(event.currentTarget.dataset.url, '链接已复制，可在浏览器打开');
  },

  copyPage() {
    store.copyText(`/pages/item/item?id=${encodeURIComponent(this.raw.id)}`, '小程序页面路径已复制');
  },

  copyMarkdown() {
    store.copyText(itemMarkdown(this.raw), '已复制这条资料的 Markdown');
  },

  openRelated(event) {
    wx.navigateTo({ url: `/pages/item/item?id=${encodeURIComponent(event.currentTarget.dataset.id)}` });
  },

  goRules() {
    wx.navigateTo({ url: '/pages/risk-rules/risk-rules' });
  },

  onShareAppMessage() {
    const detail = this.data.detail;
    return {
      title: detail ? detail.title : 'AI 威胁情报站',
      path: `/pages/item/item?id=${encodeURIComponent(detail ? detail.id : '')}`,
    };
  },
});
