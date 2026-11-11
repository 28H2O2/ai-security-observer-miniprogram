const store = require('../../utils/data.js');
const { sourceCatalogView } = require('../../utils/source-model.js');

Page({
  data: {
    q: '',
    groups: [],
    count: 0,
    total: 0,
    selected: null,
    viewState: 'ready',
  },

  onLoad() {
    this.refresh();
  },

  refresh() {
    const view = sourceCatalogView(store.sources, { q: this.data.q, source: 'all' });
    const counts = new Map();
    store.items.forEach(item => counts.set(item.sourceId, (counts.get(item.sourceId) || 0) + 1));
    const groups = view.groups.map(group => ({
      id: group.id,
      label: group.label,
      sources: group.sources.map(source => ({
        id: source.id,
        label: store.sourceLabel(source),
        count: counts.get(source.id) || 0,
        statusText: source.status === 'checked' ? '公开入口已核验' : '参考资料',
      })),
    }));
    this.setData({ groups, count: view.count, total: view.total, viewState: 'ready', selected: null });
  },

  onSearch(event) {
    this.setData({ q: event.detail.value }, () => this.refresh());
  },

  clearSearch() {
    this.setData({ q: '' }, () => this.refresh());
  },

  onSelect(event) {
    const id = event.currentTarget.dataset.id;
    const source = store.sources.find(entry => entry.id === id);
    if (!source) return;
    const count = store.items.filter(item => item.sourceId === id).length;
    this.setData({
      selected: {
        id: source.id,
        name: source.name,
        label: store.sourceLabel(source),
        description: source.description || '',
        method: (source.method || '').toUpperCase(),
        statusText: source.status === 'checked' ? '公开入口已核验' : '参考资料',
        checkedAt: source.checkedAt || '',
        notes: source.notes || '',
        url: store.safeUrl(source.url),
        endpoint: store.safeUrl(source.endpoint),
        count,
      },
    });
  },

  closeDetail() {
    this.setData({ selected: null });
  },

  copyUrl(event) {
    store.copyText(event.currentTarget.dataset.url, '来源链接已复制，可在浏览器打开');
  },

  viewItems(event) {
    const id = event.currentTarget.dataset.id;
    getApp().globalData.pendingFilter = { source: id };
    wx.switchTab({ url: '/pages/index/index' });
  },

  goRules() {
    wx.navigateTo({ url: '/pages/risk-rules/risk-rules' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  onShareAppMessage() {
    return { title: '复旦 JADE · AI 威胁情报站 来源库', path: '/pages/sources/sources' };
  },
});
