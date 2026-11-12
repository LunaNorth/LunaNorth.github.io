/**
 * 标签页标题小彩蛋
 * 切换走 → 标题变成「我先在这里等你」
 * 切回来 → 短暂显示「嘿嘿，上当了吧」，2 秒后还原真实标题
 *
 * 设计要点：
 * 1. 事件只绑定一次（window 标记防重），不会因为页面重载/PJAX 累积监听器
 * 2. 用 MutationObserver 跟踪 <title> 的变化，天然兼容 PJAX / 主题更新标题，
 *    不需要依赖 pjax:complete，也不会把伪装文案误存成"原始标题"
 * 3. 只改运行时 document.title，不碰 HTML 里的 <title>，
 *    搜索引擎抓到的仍是页面正常标题
 * 4. 延迟 ARM_DELAY 毫秒才启用，避开爬虫渲染瞬间
 */
(() => {
  if (window.__lunaTabTitle) return;
  window.__lunaTabTitle = true;

  // ===== 可自定义 =====
  const TITLE_HIDDEN = '我先在这里等你';
  const TITLE_BACK = 'ヾ(≧∇≦*)ゝ嘿嘿，上当了吧';
  const BACK_DURATION = 2000; // 回来后伪装文案停留时长(ms)
  const ARM_DELAY = 1000; // 页面加载多久后才启用(ms)
  // ===================

  const isFake = (t) => t === TITLE_HIDDEN || t === TITLE_BACK;

  let originTitle = document.title;
  let timer = null;
  let armed = false;

  // <title> 一有变化就同步真实标题，伪装文案不入库
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      const t = document.title;
      if (!document.hidden && !isFake(t) && t) originTitle = t;
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (!armed) return;
    clearTimeout(timer);

    if (document.hidden) {
      document.title = TITLE_HIDDEN;
      return;
    }

    document.title = TITLE_BACK;
    timer = setTimeout(() => {
      document.title = originTitle;
    }, BACK_DURATION);
  });

  // 卸载前把定时器收掉，避免回调落在已销毁的页面上
  window.addEventListener('pagehide', () => clearTimeout(timer));

  setTimeout(() => {
    armed = true;
  }, ARM_DELAY);
})();
