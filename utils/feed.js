// 三个列表页共用的 Page 配置工厂，避免复制三份相同逻辑
const store = require('./data.js');
const { filterItems, topics } = require('./model.js');
const { listToCards } = require('./view.js');
const { exportMarkdown, exportJson } = require('./publication.js');
const { RISK_RULES } = require('./risk-rules.js');

function pickerDefs(view) {
  const used = store.usedSources(view);
  return {
    source: {
      values: ['all', ...used.map(entry => entry.id)],
      labels: ['全部来源', ...used.map(entry => `${entry.label} (${entry.count})`)],
    },
    evidence: {
      values: ['all', 'primary', 'compilation'],
      labels: ['全部资料', '一手披露', 'PDF 汇编'],
    },
    period: {
      values: ['all', '7', '30', '90'],
      labels: ['全部时间', '最近 7 天', '最近 30 天', '最近 90 天'],
    },
    assessment: {
      values: Object.keys(RISK_RULES.filters),
      labels: Object.keys(RISK_RULES.filters).map(key => RISK_RULES.filters[key]),
    },
    sort: {
      values: ['latest', 'oldest', 'risk'],
      labels: ['最新在前', '最早在前', '风险优先'],
    },
  };
}

function initialData(view, title, defs) {
  const data = {
    title,
    updatedAt: store.meta.updatedAt,
    total: store.meta.total,
    q: '',
    topic: 'all',
    topicList: topics.map(entry => ({ id: entry.id, label: entry.label, active: entry.id === 'all' })),
    filterOpen: false,
    unread: false,
    cards: [],
    count: 0,
    viewState: 'loading',
  };
  Object.keys(defs).forEach(key => {
    data[key] = defs[key].values[0];
    data[`${key}Values`] = defs[key].values;
    data[`${key}Labels`] = defs[key].labels;
    data[`${key}Index`] = 0;
    data[`${key}Label`] = defs[key].labels[0];
  });
  return data;
}

function create(view, title) {
  const defs = pickerDefs(view);
  return {
    data: initialData(view, title, defs),

    onLoad() {
      this.refresh();
    },

    onShow() {
      const app = getApp();
      const pending = app.globalData.pendingFilter;
      if (pending && pending.source) {
        app.globalData.pendingFilter = null;
        const index = Math.max(0, this.data.sourceValues.indexOf(pending.source));
        this.setData({
          source: this.data.sourceValues[index],
          sourceIndex: index,
          sourceLabel: this.data.sourceLabels[index],
        });
      }
      this.refresh();
    },

    currentFilters() {
      const d = this.data;
      return {
        view,
        q: d.q,
        source: d.source,
        topic: d.topic,
        risk: 'all',
        evidence: d.evidence,
        assessment: d.assessment,
        period: d.period,
        sort: d.sort,
        unread: d.unread,
      };
    },

    refresh() {
      try {
        const filters = this.currentFilters();
        const read = store.loadRead();
        const list = filterItems(store.items, filters, read, store.meta.updatedAt);
        this.setData({
          cards: listToCards(list, read, filters.sort),
          count: list.length,
          viewState: 'ready',
        });
      } catch (error) {
        console.error('[aso] 资料载入失败', error);
        this.setData({ viewState: 'error' });
      }
    },

    handleRetry() {
      this.setData({ viewState: 'loading' }, () => this.refresh());
    },

    onSearch(event) {
      this.setData({ q: event.detail.value }, () => this.refresh());
    },

    onTopic(event) {
      const value = event.currentTarget.dataset.value;
      const topicList = this.data.topicList.map(entry => ({ ...entry, active: entry.id === value }));
      this.setData({ topic: value, topicList }, () => this.refresh());
    },

    toggleFilter() {
      this.setData({ filterOpen: !this.data.filterOpen });
    },

    onPicker(event) {
      const key = event.currentTarget.dataset.key;
      const index = Number(event.detail.value);
      const patch = {};
      patch[key] = this.data[`${key}Values`][index];
      patch[`${key}Index`] = index;
      patch[`${key}Label`] = this.data[`${key}Labels`][index];
      this.setData(patch, () => this.refresh());
    },

    onUnread(event) {
      this.setData({ unread: event.detail.value }, () => this.refresh());
    },

    resetFilters() {
      const patch = { q: '', topic: 'all', unread: false };
      patch.topicList = this.data.topicList.map(entry => ({ ...entry, active: entry.id === 'all' }));
      Object.keys(defs).forEach(key => {
        patch[key] = defs[key].values[0];
        patch[`${key}Index`] = 0;
        patch[`${key}Label`] = defs[key].labels[0];
      });
      this.setData(patch, () => this.refresh());
    },

    openItem(event) {
      const id = event.currentTarget.dataset.id;
      wx.navigateTo({ url: `/pages/item/item?id=${encodeURIComponent(id)}` });
    },

    copyOriginal(event) {
      store.copyText(event.currentTarget.dataset.url, '原文链接已复制');
    },

    onExport(event) {
      const filters = this.currentFilters();
      const list = filterItems(store.items, filters, store.loadRead(), store.meta.updatedAt);
      const text = event.currentTarget.dataset.type === 'json'
        ? exportJson(list, store.meta, filters)
        : exportMarkdown(list, store.meta);
      store.copyText(text, `已复制 ${list.length} 条`);
    },

    goRules() {
      wx.navigateTo({ url: '/pages/risk-rules/risk-rules' });
    },

    goAbout() {
      wx.navigateTo({ url: '/pages/about/about' });
    },

    onShareAppMessage() {
      return {
        title: `复旦 JADE · AI 安全观察（${store.meta.updatedAt} 资料快照）`,
        path: '/pages/index/index',
      };
    },
  };
}

module.exports = { create };
