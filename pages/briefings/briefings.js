const store = require('../../utils/data.js');
const { buildBriefingView } = require('../../utils/view.js');
const { periodBounds, makeBriefing, briefingMarkdown } = require('../../utils/publication.js');

Page({
  data: {
    mode: 'daily',
    date: '',
    modeLabel: '日报',
    archive: [],
    briefing: null,
    updatedAt: store.meta.updatedAt,
    viewState: 'loading',
  },

  onLoad() {
    const first = store.briefings.daily[0];
    this.setData({ date: first ? first.start : store.meta.updatedAt }, () => this.build());
  },

  build() {
    try {
      const mode = this.data.mode;
      const date = this.data.date;
      const list = store.briefings[mode] || [];
      const start = periodBounds(date, mode).start;
      const briefing = list.find(entry => entry.start === start) || makeBriefing(store.items, date, mode);
      const archive = list.map(entry => ({
        start: entry.start,
        total: entry.total,
        active: entry.start === start,
        label: mode === 'weekly'
          ? `${store.formatDate(entry.start)} — ${store.formatDate(entry.end)}`
          : store.formatDate(entry.start),
      }));
      this.briefing = briefing;
      this.setData({
        briefing: buildBriefingView(briefing),
        archive,
        modeLabel: mode === 'weekly' ? '周报' : '日报',
        viewState: 'ready',
      });
    } catch (error) {
      console.error('[aso] 简报生成失败', error);
      this.setData({ viewState: 'error' });
    }
  },

  onMode(event) {
    const mode = event.currentTarget.dataset.mode;
    const first = store.briefings[mode][0];
    this.setData({
      mode,
      date: first ? first.start : store.meta.updatedAt,
    }, () => this.build());
  },

  onDate(event) {
    this.setData({ date: event.detail.value }, () => this.build());
  },

  onArchive(event) {
    this.setData({ date: event.currentTarget.dataset.start }, () => this.build());
  },

  copyMarkdown() {
    if (!this.briefing) return;
    store.copyText(briefingMarkdown(this.briefing, store.items, store.meta), '简报 Markdown 已复制');
  },

  openItem(event) {
    wx.navigateTo({ url: `/pages/item/item?id=${encodeURIComponent(event.currentTarget.dataset.id)}` });
  },

  handleRetry() {
    this.setData({ viewState: 'loading' }, () => this.build());
  },

  onShareAppMessage() {
    return {
      title: `复旦 JADE · 安全${this.data.modeLabel}`,
      path: '/pages/briefings/briefings',
    };
  },
});
