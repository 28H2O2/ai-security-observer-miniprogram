// 三个列表页共用的 Page 配置工厂
// 首页只保留「浏览」能力；导出、说明类入口移到详情页与来源页
// WXML 用到的文案、class 都在这里预计算，模板只保留最简单的变量绑定
const store = require('./data.js');
const { filterItems, topics } = require('./model.js');
const { listToCards } = require('./view.js');
const { RISK_RULES } = require('./risk-rules.js');

const SUMMARY_LIMIT = 56;

function briefSummary(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > SUMMARY_LIMIT ? clean.slice(0, SUMMARY_LIMIT) + '…' : clean;
}

function topicItems() {
  return topics.map(entry => ({
    id: entry.id,
    label: entry.label,
    active: entry.id === 'all',
    className: 'topic' + (entry.id === 'all' ? ' active' : ''),
  }));
}

function decorateCards(list, read, sort) {
  return listToCards(list, read, sort).map(card => Object.assign({}, card, {
    itemClass: 'news-item' + (card.isRead ? ' is-read' : ''),
    kindClass: 'kind kind-' + card.kind,
    asoClassName: 'aso aso-' + (card.asoClass || 'low'),
    briefSummary: briefSummary(card.summary),
  }));
}

function pickerDefs(view) {
  const used = store.usedSources(view);
  return {
    source: {
      values: ['all'].concat(used.map(entry => entry.id)),
      labels: ['全部来源'].concat(used.map(entry => `${entry.label} (${entry.count})`)),
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
    topicList: topicItems(),
    filterOpen: false,
    filterHint: '筛选',
    unread: false,
    cards: [],
    count: 0,
    resultText: '0 条',
    loading: true,
    ready: false,
    emptyState: false,
    errorState: false,
    errorText: '',
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
      const app = typeof getApp === 'function' ? getApp() : null;
      const pending = app && app.globalData ? app.globalData.pendingFilter : null;
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
          cards: decorateCards(list, read, filters.sort),
          count: list.length,
          resultText: `${list.length} 条`,
          loading: false,
          ready: list.length > 0,
          emptyState: list.length === 0,
          errorState: false,
          errorText: '',
        });
      } catch (error) {
        console.error('[aso] 资料载入失败', error);
        this.setData({
          loading: false,
          ready: false,
          emptyState: false,
          errorState: true,
          errorText: error && error.message ? error.message : '本地数据读取失败，请重试。',
        });
      }
    },

    handleRetry() {
      this.setData({ loading: true, ready: false, emptyState: false, errorState: false }, () => this.refresh());
    },

    onSearch(event) {
      this.setData({ q: event.detail.value }, () => this.refresh());
    },

    onTopic(event) {
      const value = event.currentTarget.dataset.value;
      const topicList = this.data.topicList.map(entry => Object.assign({}, entry, {
        active: entry.id === value,
        className: 'topic' + (entry.id === value ? ' active' : ''),
      }));
      this.setData({ topic: value, topicList }, () => this.refresh());
    },

    toggleFilter() {
      const filterOpen = !this.data.filterOpen;
      this.setData({ filterOpen, filterHint: filterOpen ? '收起' : '筛选' });
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
      const patch = { q: '', topic: 'all', unread: false, topicList: topicItems() };
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

    onShareAppMessage() {
      return {
        title: `复旦 JADE · AI 安全观察（${store.meta.updatedAt} 资料快照）`,
        path: '/pages/index/index',
      };
    },
  };
}

module.exports = { create };
