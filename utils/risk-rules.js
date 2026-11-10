// ASO Risk Score v1.0 规则（与网页项目 dist/risk-rules.js 保持同一版本）
const RISK_RULES = {
  version: 'aso-risk-v1.0',
  name: 'ASO Risk Score v1.0',
  min: 0,
  max: 5,
  dimensions: {
    I: {
      name: '安全后果', english: 'Impact', coefficient: 7,
      anchors: [
        '未体现实际安全边界损害',
        '轻微输出偏离、有限功能干扰',
        '有限的信息暴露或操作异常',
        '明确的未授权操作、敏感数据暴露或权限滥用',
        '严重数据泄露、关键系统操作失控或高影响攻击后果',
        '严重代码执行、高权限系统接管、大规模敏感数据失陷',
      ],
    },
    F: {
      name: '可利用性', english: 'Feasibility', coefficient: 5,
      anchors: [
        '只有理论假设，尚无合理攻击路径',
        '依赖非常苛刻的环境、权限或复杂条件',
        '需要多个非默认前置条件或较高攻击能力',
        '可通过正常工作流接触的低信任内容触发',
        '攻击门槛低，通常不需要特殊权限，利用路径较直接',
        '能够远程、无需认证、无需额外用户交互地直接触发',
      ],
    },
    S: {
      name: '影响范围', english: 'Scope', coefficient: 4,
      anchors: [
        '尚无明确的受影响对象',
        '仅限实验环境、罕见配置或特定个人系统',
        '影响特定产品、平台或配置',
        '影响明确的生产产品及一部分常见部署',
        '涉及多个广泛使用的产品或部署场景',
        '涉及大规模部署的核心基础组件或广泛的 AI 系统生态',
      ],
    },
    A: {
      name: '利用证据', english: 'Activity', coefficient: 4,
      anchors: [
        '已核查未见公开 PoC 或在野利用证据',
        '存在具体攻击路径或初步可行性分析',
        '有可核实的研究 PoC 或受控实验',
        '有多个独立利用验证，或可信的实际攻击尝试观测',
        '有可信的在野利用记录',
        '有权威确认的实际利用，例如 CISA KEV 收录',
      ],
    },
  },
  statuses: {
    scored: '已评分',
    insufficient_evidence: '待评估 · 证据不足',
    not_applicable: '不适用',
    needs_review: '待评估 · 待复核',
  },
  confidence: { high: '高', medium: '中', low: '低' },
  activity: {
    unknown: '利用证据未知',
    confirmed_no_public_evidence: '已核查未见公开 PoC 或在野利用',
    attack_path: '具体攻击路径',
    controlled_poc: '受控 PoC',
    independent_validations: '多个独立验证',
    observed_attempts: '攻击尝试观测',
    in_the_wild: '在野利用记录',
    confirmed_exploitation: '已确认实际利用',
  },
  filters: { all: '全部评估状态', scored: '已评分', pending: '待评估', not_applicable: '不适用' },
  pendingStatuses: ['insufficient_evidence', 'needs_review'],
};

const DIMENSION_KEYS = ['I', 'F', 'S', 'A'];
const MAX_RISK_SCORE = DIMENSION_KEYS.reduce(
  (sum, key) => sum + RISK_RULES.dimensions[key].coefficient * RISK_RULES.max, 0
);
const RISK_FORMULA = DIMENSION_KEYS.map(
  key => `${RISK_RULES.dimensions[key].coefficient} × ${key}`
).join(' + ');

module.exports = { RISK_RULES, DIMENSION_KEYS, MAX_RISK_SCORE, RISK_FORMULA };
