// 简报与导出，去掉了网页项目里依赖 URL / Blob 的部分
const { itemDate, kindNames, riskNames, filterItems } = require('./model.js');

const sectionKinds = ['incident', 'advisory', 'research'];

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function periodBounds(value, mode) {
  if (!validDate(value)) throw new Error('日期无效');
  const date = new Date(`${value}T00:00:00Z`);
  if (mode === 'weekly') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const start = date.toISOString().slice(0, 10);
  if (mode === 'weekly') date.setUTCDate(date.getUTCDate() + 6);
  return { start, end: date.toISOString().slice(0, 10) };
}

function makeBriefing(items, value, mode) {
  const period = mode || 'daily';
  const { start, end } = periodBounds(value, period);
  const selected = filterItems(items).filter(item => itemDate(item) >= start && itemDate(item) <= end);
  return {
    mode: period, start, end, total: selected.length,
    sections: sectionKinds.map(kind => ({
      kind, label: kindNames[kind],
      itemIds: selected.filter(item => item.kind === kind).map(item => item.id),
    })),
  };
}

function detailPath(item) {
  return `/pages/item/item?id=${encodeURIComponent(item.id)}`;
}

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : null;
}

function md(value) {
  return String(value === null || value === undefined ? '未披露' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]#])/g, '\\$1');
}

function itemMarkdown(item) {
  const lines = [
    `### ${md(item.title)}`, '',
    `- 披露日期：${item.originalPublishedAt || '未披露'}${!item.originalPublishedAt ? `（汇编归档：${item.publishedAt}）` : ''}`,
    `- 来源：${md(item.sourceName)}｜${kindNames[item.kind]}｜${riskNames[item.risk] || ''}`,
    `- 资料状态：${item.evidence === 'primary' ? '附原始披露' : 'PDF 汇编，待补原文'}`,
    `- 小程序详情：${detailPath(item)}`, '',
    `**核心摘要：** ${md(item.summary)}`, '',
    `**影响范围：** ${md(item.impact)}`, '',
    `**处置建议：** ${md(item.recommendation)}`, '',
    `**证据与边界：** ${md(item.limitations)}`,
  ];
  if ((item.cveIds || []).length) lines.push('', `**CVE：** ${item.cveIds.map(md).join('、')}`);
  if (item.cvePublishedAt) lines.push('', `**CVE 发布日期：** ${item.cvePublishedAt}`);
  if ((item.preconditions || []).length) {
    lines.push('', '**利用条件：**', '', ...item.preconditions.map(entry => `- ${md(entry)}`));
  }
  if ((item.affectedPackages || []).length) {
    lines.push('', '**受影响版本：**', '', ...item.affectedPackages.map(p =>
      `- ${md(p.name)} (${md(p.ecosystem)})：${md(p.affectedRange)}；修复版本：${md(p.fixedVersion)}`));
  }
  lines.push('', '**原始来源：**', '');
  const refs = (item.references || []).filter(ref => safeUrl(ref.url));
  lines.push(...refs.map(ref => `- [${md(ref.label)}](${ref.url})`));
  if (item.pdfPage) lines.push(`- 《2026年10月人工智能安全事件一览》第 ${item.pdfPage} 页 · ${md(item.externalId)}`);
  if (!refs.length) lines.push('- 原始公开链接待补。');
  return lines.join('\n');
}

function exportMarkdown(list, meta) {
  return [
    '# 复旦 JADE · AI 威胁情报站', '',
    `当前筛选结果 · ${list.length} 条`, '',
    `按已收录资料汇编 · 资料更新：${meta.updatedAt} · 人工整理，非实时核验`, '',
    ...list.map(itemMarkdown),
  ].join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function exportJson(list, meta, filters) {
  return JSON.stringify({
    meta: {
      title: meta.title, version: meta.version, updatedAt: meta.updatedAt,
      timeZone: meta.timeZone, mode: meta.mode, scheduledCollection: false, total: list.length,
    },
    filters: filters,
    items: list.map(item => ({ ...item, detailPath: detailPath(item) })),
  }, null, 2) + '\n';
}

function briefingMarkdown(briefing, items, meta) {
  const byId = new Map(items.map(item => [item.id, item]));
  const lines = [
    `# 复旦 JADE · 安全${briefing.mode === 'weekly' ? '周报' : '日报'}`, '',
    `覆盖日期：${briefing.start} 至 ${briefing.end} · ${briefing.total} 条`, '',
    `按已收录资料汇编 · 资料更新：${meta.updatedAt} · 人工整理，非实时核验`,
  ];
  if (!briefing.total) lines.push('', '本站暂无收录。');
  else for (const section of briefing.sections) {
    lines.push('', `## ${section.label}（${section.itemIds.length}）`, '');
    lines.push(...(section.itemIds.length
      ? section.itemIds.map(id => itemMarkdown(byId.get(id)))
      : ['本站暂无收录。']));
  }
  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

module.exports = {
  sectionKinds, validDate, periodBounds, makeBriefing, detailPath,
  itemMarkdown, exportMarkdown, exportJson, briefingMarkdown,
};
