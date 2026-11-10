const { RISK_RULES, DIMENSION_KEYS, MAX_RISK_SCORE, RISK_FORMULA } = require('../../utils/risk-rules.js');
const store = require('../../utils/data.js');

Page({
  data: {
    formula: '',
    max: 100,
    version: '',
    total: 0,
    dimensions: [],
    statuses: [],
  },

  onLoad() {
    const colors = { I: 'red', F: 'amber', S: 'teal', A: 'indigo' };
    const dimensions = DIMENSION_KEYS.map(key => {
      const rule = RISK_RULES.dimensions[key];
      return {
        key,
        name: rule.name,
        english: rule.english,
        coefficient: rule.coefficient,
        weight: rule.coefficient * RISK_RULES.max,
        color: colors[key],
        anchors: rule.anchors.slice().reverse().map((text, index) => ({
          level: RISK_RULES.max - index,
          text,
        })),
      };
    });
    const statuses = Object.keys(RISK_RULES.statuses).map(key => ({
      label: RISK_RULES.statuses[key],
      count: store.coverage.statuses[key] || 0,
    }));
    this.setData({
      formula: RISK_FORMULA,
      max: MAX_RISK_SCORE,
      version: RISK_RULES.version,
      total: store.coverage.total,
      dimensions,
      statuses,
    });
  },

  goFeed() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    return { title: '复旦 JADE · ASO Risk Score v1.0', path: '/pages/risk-rules/risk-rules' };
  },
});
