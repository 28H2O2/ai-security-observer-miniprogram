// 评分校验与排序函数，从网页项目 dist/risk-score.js 移除了浏览器 URL 依赖
const { RISK_RULES, DIMENSION_KEYS } = require('./risk-rules.js');

function calculateRiskScore(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') return null;
  for (const key of DIMENSION_KEYS) {
    const value = dimensions[key];
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < RISK_RULES.min || value > RISK_RULES.max) return null;
  }
  return DIMENSION_KEYS.reduce(
    (sum, key) => sum + dimensions[key] * RISK_RULES.dimensions[key].coefficient, 0
  );
}

function hasRiskScore(assessment) {
  if (!assessment || assessment.status !== 'scored' || assessment.ruleVersion !== RISK_RULES.version) return false;
  if (!Number.isInteger(assessment.score)) return false;
  return calculateRiskScore(assessment.dimensions) === assessment.score;
}

function matchesRiskAssessment(item, filter) {
  const assessment = item.riskAssessment;
  if (filter === 'scored') return hasRiskScore(assessment);
  if (filter === 'pending') {
    return !assessment || RISK_RULES.pendingStatuses.includes(assessment.status) ||
      (assessment.status === 'scored' && !hasRiskScore(assessment));
  }
  if (filter === 'not_applicable') return !!assessment && assessment.status === 'not_applicable';
  return true;
}

function compareRiskScores(a, b) {
  const scoredA = hasRiskScore(a.riskAssessment);
  const scoredB = hasRiskScore(b.riskAssessment);
  if (scoredA !== scoredB) return scoredA ? -1 : 1;
  return scoredA ? b.riskAssessment.score - a.riskAssessment.score : 0;
}

module.exports = { hasRiskScore, matchesRiskAssessment, compareRiskScores, calculateRiskScore };
