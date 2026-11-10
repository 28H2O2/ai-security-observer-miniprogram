// 把资料对象整理成 WXML 可直接渲染的视图模型（WXML 不支持复杂表达式）
const store = require('./data.js');
const { kindNames, riskNames, itemDate } = require('./model.js');
const { hasRiskScore } = require('./risk-score.js');
const { RISK_RULES, DIMENSION_KEYS, MAX_RISK_SCORE, RISK_FORMULA } = require('./risk-rules.js');

function buildCard(item, read, options) {
  const settings = options || {};
  const assessment = item.riskAssessment;
  const scored = hasRiskScore(assessment);
  const score = scored ? assessment.score : 0;
  const refs = item.references || [];
  const original = refs.find(ref => ref.role === 'primary' && store.safeUrl(ref.url)) ||
    refs.find(ref => store.safeUrl(ref.url));
  return {
    id: item.id,
    title: item.title || '',
    summary: item.summary || '',
    kind: item.kind,
    kindLabel: kindNames[item.kind] || '资料',
    sourceName: item.sourceName || '',
    dateText: store.formatDate(itemDate(item)),
    showDate: !!settings.showDate,
    dayHeading: settings.dayHeading || '',
    year: settings.year || '',
    tags: (item.tags || []).slice(0, 2),
    asoText: scored ? `ASO ${score}/${MAX_RISK_SCORE}` : '',
    asoClass: score >= 70 ? 'high' : score >= 55 ? 'mid' : 'low',
    isRead: read.has(item.id),
    originalUrl: original ? original.url : '',
    isCompilation: item.evidence === 'compilation',
  };
}

function listToCards(list, read, sort) {
  let previous = '';
  return list.map(item => {
    const value = itemDate(item);
    const heading = sort !== 'risk' && value !== previous ? store.shortDate(value) : '';
    const year = heading ? value.slice(0, 4) : '';
    previous = value;
    return buildCard(item, read, { showDate: sort === 'risk', dayHeading: heading, year });
  });
}

function buildRisk(item) {
  const a = item.riskAssessment;
  if (!a) return null;
  const scored = hasRiskScore(a);
  const evidence = a.evidence || {};
  const dimensions = DIMENSION_KEYS.filter(key => evidence[key]).map(key => {
    const rule = RISK_RULES.dimensions[key];
    const value = a.dimensions ? a.dimensions[key] : null;
    const known = Number.isInteger(value);
    return {
      key,
      name: rule.name,
      english: rule.english,
      coefficient: rule.coefficient,
      valueText: known ? `${value}/${RISK_RULES.max}` : '未知',
      percent: known ? Math.round(value / RISK_RULES.max * 100) : 0,
      known,
      contribution: known ? `贡献 ${value * rule.coefficient} 分` : '',
      reason: evidence[key].reason || '尚未核对这一维度的证据。',
    };
  });
  const consequences = [];
  if (a.consequences && a.consequences.potential) {
    consequences.push({ label: '潜在后果', value: a.consequences.potential });
  }
  if (a.consequences && a.consequences.observed) {
    consequences.push({ label: '实际观测', value: a.consequences.observed });
  }
  const evidenceSources = (a.sources || []).map(source => ({
    label: source.label || '原始证据',
    url: store.safeUrl(source.url),
    locator: source.locator || '',
    accessedAt: source.accessedAt || '',
  }));
  return {
    hasScore: scored,
    score: scored ? a.score : 0,
    max: MAX_RISK_SCORE,
    statusText: scored ? '已评分' : (RISK_RULES.statuses[a.status] || '待评估'),
    reason: a.reason || '',
    activity: RISK_RULES.activity[a.activity] || '',
    formula: RISK_FORMULA,
    dimensions,
    hasDimensions: dimensions.length > 0,
    consequences,
    hasConsequences: consequences.length > 0,
    evidenceSources,
    hasEvidenceSources: evidenceSources.length > 0,
    confidence: RISK_RULES.confidence[a.confidence] || '未知',
    assessedAt: a.assessedAt || '',
    reviewedText: a.reviewed ? '已人工复核' : '未人工复核',
    ruleVersion: a.ruleVersion || '',
  };
}

function buildDetail(item) {
  const refs = (item.references || []).filter(ref => store.safeUrl(ref.url)).map(ref => ({
    label: ref.label || '原始披露',
    url: ref.url,
    hostname: store.hostname(ref.url),
  }));
  const identifiers = [...new Set([item.externalId, ...(item.cveIds || [])].filter(Boolean))];
  const packages = (item.affectedPackages || []).map(entry => ({
    name: entry.name || '',
    ecosystem: entry.ecosystem || '',
    affectedRange: entry.affectedRange || '未明确披露',
    fixedVersion: entry.fixedVersion || '未明确披露',
  }));
  const infoRows = [
    { label: '披露来源', value: item.sourceName || '未披露' },
    { label: '原始披露日期', value: store.formatDate(item.originalPublishedAt) },
    { label: '汇编归档日期', value: store.formatDate(item.publishedAt) },
    { label: '事件发生时间', value: item.occurredAt || '未披露' },
    { label: '风险类别', value: riskNames[item.risk] || '未分类' },
    { label: '涉及对象', value: (item.entities || []).join('、') || '未具名' },
    { label: '资料状态', value: item.evidence === 'primary' ? '附原始披露' : 'PDF 汇编，待补原文' },
  ];
  if (item.cvePublishedAt) {
    infoRows.splice(2, 0, { label: 'CVE 发布日期', value: store.formatDate(item.cvePublishedAt) });
  }
  const related = store.items
    .filter(entry => entry.id !== item.id && entry.evidence === 'primary' &&
      (entry.tags || []).some(tag => (item.tags || []).includes(tag)))
    .slice(0, 2)
    .map(entry => ({ id: entry.id, title: entry.title }));
  return {
    id: item.id,
    title: item.title || '',
    summary: item.summary || '',
    kind: item.kind,
    kindLabel: kindNames[item.kind] || '资料',
    sourceName: item.sourceName || '',
    dateText: store.formatDate(itemDate(item)),
    evidenceLabel: item.evidenceLabel || '',
    tags: item.tags || [],
    identifiers,
    hasIdentifiers: identifiers.length > 0,
    references: refs,
    hasReferences: refs.length > 0,
    pdfReference: item.pdfPage
      ? `《2026年10月人工智能安全事件一览》第 ${item.pdfPage} 页 · ${item.externalId || ''}` : '',
    originalUrl: refs.length ? refs[0].url : '',
    packages,
    hasPackages: packages.length > 0,
    preconditions: item.preconditions || [],
    hasPreconditions: (item.preconditions || []).length > 0,
    limitations: item.limitations || '本站未记录额外边界说明。',
    impact: item.impact || '',
    hasImpact: !!item.impact,
    recommendation: item.recommendation || '',
    hasRecommendation: !!item.recommendation,
    risk: buildRisk(item),
    infoRows,
    related,
    hasRelated: related.length > 0,
  };
}

function buildBriefingView(briefing) {
  const byId = new Map(store.items.map(item => [item.id, item]));
  const sections = (briefing.sections || []).map(section => {
    const entries = (section.itemIds || []).map(id => byId.get(id)).filter(Boolean).map(item => ({
      id: item.id,
      title: item.title || '',
      summary: item.summary || '',
      kindLabel: kindNames[item.kind] || '资料',
      dateText: store.formatDate(itemDate(item)),
    }));
    return {
      label: section.label,
      count: entries.length,
      hasItems: entries.length > 0,
      items: entries,
    };
  });
  return {
    mode: briefing.mode,
    start: briefing.start,
    end: briefing.end,
    startText: store.formatDate(briefing.start),
    endText: store.formatDate(briefing.end),
    total: briefing.total,
    hasItems: briefing.total > 0,
    sections,
  };
}

module.exports = { buildCard, listToCards, buildRisk, buildDetail, buildBriefingView };
