// 三个列表页共用的 Page 配置工厂
// 首页只保留「浏览」能力；搜索与筛选收进品牌行右侧的放大镜 icon，点开浮出卡片
// 内容类型（全部 / 事件 / 研究）由页内顶部文字切换承担，不再占用底部 tabBar
// WXML 用到的文案、class 都在这里预计算，模板只保留最简单的变量绑定
const store = require('./data.js');
const { filterItems, topics } = require('./model.js');
const { listToCards } = require('./view.js');
const { RISK_RULES } = require('./risk-rules.js');

const SUMMARY_LIMIT = 56;

const VIEWS = [
  { id: 'feed', label: '全部情报' },
  { id: 'incidents', label: '真实事件' },
  { id: 'research', label: '研究披露' },
];

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

function viewTabItems(active) {
  return VIEWS.map(entry => ({
    id: entry.id,
    label: entry.label,
    className: 'view-tab' + (entry.id === active ? ' active' : ''),
  }));
}

function decorateCards(list, read, sort, view) {
  return listToCards(list, read, sort).map(card => Object.assign({}, card, {
    itemClass: 'news-item' + (card.isRead ? ' is-read' : ''),
    kindClass: 'kind kind-' + card.kind,
    asoClassName: 'aso aso-' + (card.asoClass || 'low'),
    briefSummary: briefSummary(card.summary),
    // 「真实事件」页整页都是事件，红色标签失去区分意义，故隐藏
    showKind: view !== 'incidents',
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

// 内容类型属于导航而非筛选，不计入放大镜的红色状态
function activeFilter(filters, defs) {
  if (filters.q || filters.topic !== 'all' || filters.unread) return true;
  return ['source', 'evidence', 'period', 'assessment'].some(key => filters[key] !== defs[key].values[0]);
}

function searchIconClass(overlayOpen, filterActive) {
  return 'search-icon' + (overlayOpen || filterActive ? ' is-active' : '');
}

function initialData(view, title, defs) {
  const data = {
    title,
    updatedAt: store.meta.updatedAt,
    total: store.meta.total,
    q: '',
    topic: 'all',
    contentView: view,
    viewTabs: viewTabItems(view),
    topicList: topicItems(),
    overlayOpen: false,
    searchIconClass: 'search-icon',
    filterActive: false,
    unread: false,
    cards: [],
    count: 0,
    resultText: '0 条结果',
    doneText: '查看 0 条结果',
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
        view: d.contentView || view,
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
        const filterActive = activeFilter(filters, defs);
        this.setData({
          cards: decorateCards(list, read, filters.sort, filters.view),
          count: list.length,
          resultText: `${list.length} 条结果`,
          doneText: `查看 ${list.length} 条结果`,
          filterActive,
          searchIconClass: searchIconClass(this.data.overlayOpen, filterActive),
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

    onView(event) {
      const value = event.currentTarget.dataset.value;
      if (value === this.data.contentView) return;
      this.setData({ contentView: value, viewTabs: viewTabItems(value) }, () => this.refresh());
    },

    onTopic(event) {
      const value = event.currentTarget.dataset.value;
      const topicList = this.data.topicList.map(entry => Object.assign({}, entry, {
        active: entry.id === value,
        className: 'topic' + (entry.id === value ? ' active' : ''),
      }));
      this.setData({ topic: value, topicList }, () => this.refresh());
    },

    toggleOverlay() {
      const overlayOpen = !this.data.overlayOpen;
      this.setData({
        overlayOpen,
        searchIconClass: searchIconClass(overlayOpen, this.data.filterActive),
      });
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
        title: `复旦 JADE · AI 威胁情报站（${store.meta.updatedAt} 资料快照）`,
        path: '/pages/index/index',
      };
    },
  };
}

module.exports = { create };
