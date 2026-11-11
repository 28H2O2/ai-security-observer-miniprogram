// 数据模块读取失败时仍保证 App 注册成功（兼容不加载本地模块的 H5 预览器）
let meta = { updatedAt: '2026-11-10', total: 103 };
try {
  meta = require('./data/items.js').meta || meta;
} catch (error) {
  // 保留上面的快照默认值
}

App({
  globalData: {
    siteName: '复旦 JADE · AI 威胁情报站',
    updatedAt: meta.updatedAt,
    total: meta.total,
    pendingFilter: null,
  },
});
