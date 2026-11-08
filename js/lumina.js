/* 轻语 / Lumina — 碎碎念页面脚本
 * 版式与交互对齐 siyuan-lumina 插件「清风视图」
 * 数据源：#lumina-data（由 includes/page/lumina.pug 从 source/_data/lumina.yml 注入）
 */
(function () {
  'use strict';

  var app = document.querySelector('.lumina-app');
  if (!app) return;

  var dataEl = document.getElementById('lumina-data');
  var payload = null;
  try {
    payload = JSON.parse((dataEl && dataEl.textContent) || '{}');
  } catch (err) {
    payload = null;
  }

  // 兼容两种数据形态：老版本纯数组 / 现在 { settings, notes }
  var rawSettings = {};
  var raw = [];
  if (Array.isArray(payload)) {
    raw = payload;
  } else if (payload && typeof payload === 'object') {
    rawSettings = payload.settings || {};
    raw = Array.isArray(payload.notes) ? payload.notes : [];
  }
  if (!Array.isArray(raw)) raw = [];

  var settings = {
    // 日期分组标题（今天 周六 / 11月4日 周三），默认不显示
    showDateGroup: rawSettings.showDateGroup === true,
    // 列表布局：1 单栏平铺 / 2 双栏瀑布流 / 3 三栏瀑布流
    columns: Math.max(1, Math.min(3, Math.round(Number(rawSettings.columns) || 1))),
    // 每页条数，0 = 不分页
    pageSize: Math.max(0, Math.round(Number(rawSettings.pageSize) || 0))
  };

  var MOBILE_MAX = 820;

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var DAY_MS = 86400000;

  /* ---------- 小工具 ---------- */

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function toDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    var s = String(value == null ? '' : value).trim().replace('T', ' ');
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return new Date(s.replace(/-/g, '/'));
  }

  function ymd(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function hm(d) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function startOfDay(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeReg(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 标签支持三种写法：
  //   tags: [记录, 计划]        YAML 数组
  //   tags: 记录                单个字符串
  //   tags: 记录, 计划 / 记录 计划 / 记录、计划   一行多个（逗号、空格、顿号、斜杠都当分隔符）
  // 每个标签前面的 # 会被去掉
  function normalizeTags(tags) {
    if (tags == null || tags === '') return [];
    var list = Array.isArray(tags) ? tags : String(tags).split(/[,，、\/|\s]+/);
    var seen = {};
    var out = [];
    list.forEach(function (t) {
      var v = String(t == null ? '' : t).trim().replace(/^#+/, '');
      if (!v || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    });
    return out;
  }

  function normalizeImages(images) {
    if (!images) return [];
    var list = Array.isArray(images) ? images : [images];
    return list.map(function (v) {
      return String(v == null ? '' : v).trim();
    }).filter(Boolean);
  }

  /* ---------- 数据整形 ---------- */

  var notes = raw.map(function (item, index) {
    if (!item || typeof item !== 'object') return null;
    var dateSource = String(item.date == null ? '' : item.date);
    var date = toDate(item.date);
    if (isNaN(date.getTime())) return null;
    return {
      id: 'lumina-note-' + index,
      date: date,
      key: ymd(date),
      content: String(item.content == null ? '' : item.content).trim(),
      // 字段名容错：tags 为准，顺带兼容 tag / tagss（后者是常见笔误）
      tags: normalizeTags(item.tags != null ? item.tags : (item.tag != null ? item.tag : item.tagss)),
      // 字段名容错：images 为准，兼容 image（单数）
      images: normalizeImages(item.images != null ? item.images : item.image),
      hasTime: /\d{1,2}:\d{1,2}/.test(dateSource),
      location: String(item.location == null ? '' : item.location).trim(),
      pinned: !!item.pinned
    };
  }).filter(Boolean);

  notes.sort(function (a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.date - a.date;
  });

  var allTags = (function () {
    var map = {};
    notes.forEach(function (n) {
      n.tags.forEach(function (t) {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.keys(map).map(function (name) {
      return { name: name, count: map[name] };
    }).sort(function (a, b) {
      return b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
  })();

  var allDays = (function () {
    var map = {};
    notes.forEach(function (n) {
      map[n.key] = (map[n.key] || 0) + 1;
    });
    return map;
  })();

  var state = {
    keyword: '',
    tag: '',
    day: '',
    view: 'all',
    reviewDay: '',
    page: 1
  };

  /* ---------- 元素 ---------- */

  var els = {
    sidebar: app.querySelector('.lumina-sidebar'),
    statNotes: document.getElementById('luminaStatNotes'),
    statTags: document.getElementById('luminaStatTags'),
    statDays: document.getElementById('luminaStatDays'),
    heatGrid: document.getElementById('luminaHeatGrid'),
    heatMonths: document.getElementById('luminaHeatMonths'),
    menuAll: document.getElementById('luminaMenuAll'),
    menuDaily: document.getElementById('luminaMenuDaily'),
    menuWeek: document.getElementById('luminaMenuWeek'),
    tagsList: document.getElementById('luminaTagsList'),
    list: document.getElementById('luminaNotesList'),
    sidebarToggle: document.getElementById('luminaSidebarToggle'),
    sidebarRestore: document.getElementById('luminaSidebarRestore')
  };

  if (!els.list) return;

  /* ---------- 全局浮层（提示 / 菜单） ---------- */

  var tip = document.createElement('div');
  tip.className = 'lumina-heat-tip';
  document.body.appendChild(tip);

  /* ---------- 侧栏：统计 / 标签 ---------- */

  function renderStats() {
    if (els.statNotes) els.statNotes.textContent = notes.length;
    if (els.statTags) els.statTags.textContent = allTags.length;
    if (els.statDays) els.statDays.textContent = Object.keys(allDays).length;
  }

  function renderTags() {
    if (!els.tagsList) return;
    if (!allTags.length) {
      els.tagsList.innerHTML = '<div class="lumina-tag-empty">还没有标签</div>';
      return;
    }
    els.tagsList.innerHTML = allTags.map(function (t) {
      var active = state.tag === t.name ? ' active' : '';
      return '<div class="lumina-tag-item' + active + '" data-tag="' + escapeHtml(t.name) + '">' +
        '<span class="lumina-tag-icon"><i class="fa-solid fa-tag"></i></span>' +
        '<span class="lumina-tag-name">' + escapeHtml(t.name) + '</span>' +
        '<span class="lumina-tag-count">' + t.count + '</span>' +
        '</div>';
    }).join('');
  }

  /* ---------- 热力图 ---------- */

  var heatCells = {};

  function renderHeatmap() {
    if (!els.heatGrid) return;

    var today = startOfDay(new Date());
    var todayKey = ymd(today);
    var end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
    var start = new Date(end.getTime() - 83 * DAY_MS);

    var cells = [];
    var months = [];
    var lastMonth = -1;

    for (var i = 0; i < 84; i++) {
      var d = new Date(start.getTime() + i * DAY_MS);
      var key = ymd(d);
      var count = allDays[key] || 0;
      var level = count >= 4 ? 4 : count;
      var future = d > today;
      var cls = 'lumina-heat-cell' + (level ? ' level-' + level : '') + (future ? ' is-future' : '');
      if (state.day === key) cls += ' selected';
      cells.push('<div class="' + cls + '" data-date="' + key + '" data-count="' + count + '"></div>');

      if (i % 7 === 0) {
        var col = i / 7;
        if (d.getMonth() !== lastMonth) {
          lastMonth = d.getMonth();
          // 窗口首列若落在某月中旬，这个月只露几天，不标（与截图里只标三个完整月一致）
          var partial = i === 0 && d.getDate() !== 1;
          if (!partial) months.push({ col: col, label: (d.getMonth() + 1) + '月' });
        }
      }
    }

    // 当天所在列之后是「未来」，这些格子不参与筛选
    els.heatGrid.innerHTML = cells.join('');

    if (els.heatMonths) {
      var labels = months.map(function (m) {
        return '<span style="grid-column:' + (m.col + 1) + '">' + m.label + '</span>';
      });
      var remain = 12 - months.length;
      for (var k = 0; k < remain; k++) labels.push('<span></span>');
      els.heatMonths.innerHTML = labels.join('');
    }

    heatCells = {};
    Array.prototype.forEach.call(els.heatGrid.children, function (cell) {
      heatCells[cell.getAttribute('data-date')] = cell;
    });

    els.heatGrid.setAttribute('data-today', todayKey);
  }

  function bindHeatmap() {
    if (!els.heatGrid) return;

    function showTip(cell) {
      var key = cell.getAttribute('data-date');
      var count = +(cell.getAttribute('data-count') || 0);
      var d = toDate(key + ' 00:00');
      tip.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK[d.getDay()] + ' · ' + count + ' 条';
      tip.classList.add('show');
      var rect = cell.getBoundingClientRect();
      var w = tip.offsetWidth;
      tip.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px';
      tip.style.top = (rect.top - tip.offsetHeight - 8) + 'px';
    }

    function hideTip() {
      tip.classList.remove('show');
    }

    els.heatGrid.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('.lumina-heat-cell');
      if (cell && !cell.classList.contains('is-future')) showTip(cell);
    });
    els.heatGrid.addEventListener('mouseout', function (e) {
      if (e.target.closest('.lumina-heat-cell')) hideTip();
    });
    els.heatGrid.addEventListener('click', function (e) {
      var cell = e.target.closest('.lumina-heat-cell');
      if (!cell || cell.classList.contains('is-future')) return;
      var key = cell.getAttribute('data-date');
      state.day = state.day === key ? '' : key;
      state.view = 'all';
      state.page = 1;
      updateMenu();
      renderHeatmap();
      renderList();
    });
    els.heatGrid.addEventListener('scroll', hideTip, true);
    app.addEventListener('scroll', hideTip, true);
  }

  /* ---------- 菜单 ---------- */

  function updateMenu() {
    var map = { all: els.menuAll, daily: els.menuDaily, week: els.menuWeek };
    Object.keys(map).forEach(function (key) {
      var el = map[key];
      if (!el) return;
      el.classList.toggle('active', state.view === key);
    });
  }

  function randomReviewDay() {
    var keys = notes.map(function (n) { return n.key; }).filter(function (key, i, arr) {
      return arr.indexOf(key) === i;
    });
    if (!keys.length) return '';
    var pool = keys.filter(function (k) { return k !== ymd(new Date()); });
    var source = pool.length ? pool : keys;
    return source[Math.floor(Math.random() * source.length)];
  }

  function setView(view) {
    state.view = view;
    // 切视图等于「重新开始看」：清掉日期/标签筛选，避免和旧筛选叠加成空列表
    state.day = '';
    state.tag = '';
    state.page = 1;
    if (view === 'daily') state.reviewDay = randomReviewDay();
    updateMenu();
    renderTags();
    renderHeatmap();
    renderList();
    els.list.scrollTop = 0;
  }

  /* ---------- 列表渲染 ---------- */

  function matchKeyword(note, keyword) {
    if (!keyword) return true;
    var hay = note.content + ' ' + note.tags.join(' ');
    return hay.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
  }

  function inThisWeek(note) {
    var today = startOfDay(new Date());
    var monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS);
    return note.date >= monday;
  }

  function visibleNotes() {
    var keyword = state.keyword.trim();
    return notes.filter(function (note) {
      if (state.tag && note.tags.indexOf(state.tag) === -1) return false;
      if (state.day && note.key !== state.day) return false;
      if (state.view === 'daily' && note.key !== state.reviewDay) return false;
      if (state.view === 'week' && !inThisWeek(note)) return false;
      return matchKeyword(note, keyword);
    });
  }

  function highlight(text, showMark) {
    var safe = escapeHtml(text);
    if (!showMark) return safe;
    var keyword = state.keyword.trim();
    if (!keyword) return safe;
    var re = new RegExp('(' + escapeReg(escapeHtml(keyword)) + ')', 'gi');
    return safe.replace(re, '<mark class="lumina-hl">$1</mark>');
  }

  function groupTitle(key) {
    var d = toDate(key + ' 00:00');
    var today = startOfDay(new Date());
    var diff = Math.round((today - d) / DAY_MS);
    var week = WEEK[d.getDay()];
    if (diff === 0) return '今天 ' + week;
    if (diff === 1) return '昨天 ' + week;
    if (d.getFullYear() !== today.getFullYear()) {
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + week;
    }
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + week;
  }

  function imageGrid(images) {
    if (!images.length) return '';
    var count = images.length;
    var cls = count === 1 ? 'single'
      : count === 2 ? 'double'
        : count === 4 ? 'four'
          : count <= 3 ? 'triple'
            : count <= 6 ? 'six'
              : count <= 9 ? 'nine' : 'multi';
    var items = images.map(function (src) {
      var isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(src);
      var inner = isVideo
        ? '<video class="lumina-grid-img" src="' + escapeHtml(src) + '" muted playsinline preload="metadata"></video>'
        : '<img class="lumina-grid-img" src="' + escapeHtml(src) + '" alt="" loading="lazy">';
      return '<div class="lumina-image-item">' + inner + '</div>';
    }).join('');
    return '<div class="lumina-image-grid ' + cls + '">' + items + '</div>';
  }

  function cardHtml(note) {
    var tags = note.tags.map(function (tag) {
      return '<span class="lumina-tag" data-tag="' + escapeHtml(tag) + '">#' + escapeHtml(tag) + '</span>';
    }).join(' ');
    var body = highlight(note.content, true).replace(/\n/g, '<br>');

    var location = note.location
      ? '<span class="lumina-note-location"><i class="fa-solid fa-location-dot"></i>' + escapeHtml(note.location) + '</span>'
      : '';

    return '<div class="lumina-note-card" data-id="' + note.id + '">' +
      '<div class="lumina-note-header">' +
      '<div class="lumina-note-meta"><span class="lumina-note-date">' + ymd(note.date) + (note.hasTime ? ' ' + hm(note.date) : '') + '</span>' + location + '</div>' +
      '<div class="lumina-note-actions">' +
      (note.pinned ? '<span class="lumina-note-pinned">置顶</span>' : '') +
      '</div>' +
      '</div>' +
      '<div class="lumina-note-content">' + body + (tags ? ' ' + tags : '') + '</div>' +
      imageGrid(note.images) +
      '</div>';
  }

  function barHtml() {
    if (state.view === 'week') {
      var weekCount = visibleNotes().length;
      return '<div class="lumina-bar">' +
        '<div class="lumina-bar-left"><i class="fa-regular fa-calendar"></i><span>本周 · 共 ' + weekCount + ' 条</span></div>' +
        '<div class="lumina-bar-center">一周的一点小记录</div>' +
        '<div class="lumina-bar-actions"><button class="lumina-bar-btn" type="button" data-act="home">回到首页</button></div>' +
        '</div>';
    }
    if (state.view === 'daily') {
      var d = toDate(state.reviewDay + ' 00:00');
      var label = isNaN(d.getTime()) ? '随机回顾' : (d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK[d.getDay()]);
      return '<div class="lumina-bar">' +
        '<div class="lumina-bar-left"><i class="fa-regular fa-calendar-check"></i><span>' + label + ' · 共 ' + visibleNotes().length + ' 条</span></div>' +
        '<div class="lumina-bar-center">回头看看这一天</div>' +
        '<div class="lumina-bar-actions">' +
        '<button class="lumina-bar-btn" type="button" data-act="shuffle">换一天</button>' +
        '<button class="lumina-bar-btn" type="button" data-act="home">回到首页</button>' +
        '</div></div>';
    }
    return '';
  }

  function emptyHtml() {
    var hint = '';
    if (state.view === 'daily') hint = '换一天看看，或者回到首页';
    else if (state.view === 'week') hint = '这周还没有留下什么';
    else if (state.day) hint = '这一天还没有记录';
    else if (state.tag) hint = '换个标签试试';
    else if (state.keyword) hint = '换个关键词试试';
    return '<div class="lumina-empty"><i class="fa-solid fa-feather-pointed"></i>' +
      '<p>这里空空如也</p>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }

  // 主题的 utils.js / main.js / 灯箱库都在本脚本之后加载，
  // 光有 btf 还不够（fancybox 的 Fancybox.bind 没就绪时会直接抛错被吞掉），
  // 所以两个条件都满足才挂，否则隔 100ms 再试，最多 2 秒
  var lightboxRetries = 0;

  function lightboxReady() {
    if (!window.btf || typeof window.btf.loadLightbox !== 'function') return false;

    // GLOBAL_CONFIG 是脚本里的 const，不是 window 属性，取不到；
    // 直接看页面引了哪个库、这个库是否真的初始化完
    if (document.querySelector('script[src*="fancybox"]')) {
      return !!(window.Fancybox && typeof window.Fancybox.bind === 'function');
    }
    if (document.querySelector('script[src*="medium-zoom"]')) {
      return typeof window.mediumZoom === 'function';
    }
    return true; // 没配灯箱
  }

  function applyLightbox() {
    var imgs = els.list.querySelectorAll('img:not(.no-lightbox):not(.medium-zoom-image)');
    if (!imgs.length) {
      lightboxRetries = 0;
      return;
    }

    if (!lightboxReady()) {
      if (lightboxRetries < 100) {
        lightboxRetries++;
        window.setTimeout(applyLightbox, 100);
      }
      return;
    }

    lightboxRetries = 0;
    try { window.btf.loadLightbox(imgs); } catch (err) { /* 忽略 */ }
  }

  /* ---------- 瀑布流 ---------- */

  // 当前瀑布流状态（供图片加载完后重新配平）
  var masonry = null;
  var MASONRY_GAP = 16;

  // 移动端强制单栏
  function effectiveColumns() {
    if (window.innerWidth <= MOBILE_MAX) return 1;
    return settings.columns;
  }

  function pickColumn(cols) {
    var target = cols[0];
    for (var i = 1; i < cols.length; i++) {
      if (cols[i].h < target.h) target = cols[i];
    }
    return target;
  }

  // 按「当前最矮的一列」依次放卡片，保持大致的阅读顺序（从左到右、时间从新到旧）
  function balanceMasonry() {
    if (!masonry) return;
    masonry.cols.forEach(function (col) { col.h = 0; });
    masonry.cards.forEach(function (card) {
      var target = pickColumn(masonry.cols);
      target.el.appendChild(card);
      target.h += card.offsetHeight + MASONRY_GAP;
    });
  }

  function renderMasonry(list, colsCount) {
    var wrap = document.createElement('div');
    wrap.className = 'lumina-masonry';
    wrap.style.gridTemplateColumns = 'repeat(' + colsCount + ', minmax(0, 1fr))';

    var cols = [];
    for (var i = 0; i < colsCount; i++) {
      var colEl = document.createElement('div');
      colEl.className = 'lumina-masonry-col';
      wrap.appendChild(colEl);
      cols.push({ el: colEl, h: 0 });
    }
    els.list.appendChild(wrap);

    var holder = document.createElement('div');
    var cards = [];
    list.forEach(function (note) {
      holder.innerHTML = cardHtml(note);
      var card = holder.firstElementChild;
      if (!card) return;
      cards.push(card);
    });

    masonry = { wrap: wrap, cols: cols, cards: cards };
    balanceMasonry();
  }

  /* ---------- 分页 ---------- */

  function pagerNumbers(total, current) {
    var out = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) out.push(i);
      return out;
    }
    out.push(1);
    var start = Math.max(2, current - 1);
    var end = Math.min(total - 1, current + 1);
    if (start > 2) out.push('...');
    for (var j = start; j <= end; j++) out.push(j);
    if (end < total - 1) out.push('...');
    out.push(total);
    return out;
  }

  function pagerHtml(total, current) {
    if (total <= 1) return '';

    var items = pagerNumbers(total, current).map(function (n) {
      if (n === '...') return '<span class="lumina-pager-ellipsis">…</span>';
      var cls = 'lumina-pager-btn' + (n === current ? ' active' : '');
      return '<button class="' + cls + '" type="button" data-page="' + n + '">' + n + '</button>';
    }).join('');

    return '<div class="lumina-pager">' +
      '<button class="lumina-pager-btn lumina-pager-nav' + (current <= 1 ? ' disabled' : '') + '" type="button" data-page="' + (current - 1) + '" aria-label="上一页"><i class="fa-solid fa-chevron-left"></i></button>' +
      items +
      '<button class="lumina-pager-btn lumina-pager-nav' + (current >= total ? ' disabled' : '') + '" type="button" data-page="' + (current + 1) + '" aria-label="下一页"><i class="fa-solid fa-chevron-right"></i></button>' +
      '</div>';
  }

  // 当前筛选结果的总页数（goPage 用）
  var pageTotal = 1;

  function goPage(page) {
    var target = Math.min(Math.max(1, page), Math.max(1, pageTotal));
    if (target === state.page) return;
    state.page = target;
    renderList();
    els.list.scrollTop = 0;
  }

  function renderList() {
    var all = visibleNotes();
    var html = barHtml();
    var cols = effectiveColumns();

    masonry = null;

    if (!all.length) {
      els.list.innerHTML = html + emptyHtml();
      return;
    }

    // 分页：先切页，再做布局（瀑布流只排当前页）
    var size = settings.pageSize;
    var totalPages = 1;
    var list = all;

    if (size > 0) {
      totalPages = Math.max(1, Math.ceil(all.length / size));
      if (state.page > totalPages) state.page = totalPages;
      var start = (state.page - 1) * size;
      list = all.slice(start, start + size);
    } else {
      state.page = 1;
    }

    pageTotal = totalPages;
    var pager = size > 0 ? pagerHtml(totalPages, state.page) : '';

    if (cols > 1) {
      // 多栏时不做日期分组（卡片自带日期，分组标题会打断瀑布流）
      els.list.innerHTML = html;
      renderMasonry(list, cols);
      if (pager) els.list.insertAdjacentHTML('beforeend', pager);
      applyLightbox();
      return;
    }

    var lastKey = '';
    list.forEach(function (note) {
      if (settings.showDateGroup && note.key !== lastKey) {
        html += '<div class="lumina-date-group">' + groupTitle(note.key) + '</div>';
      }
      lastKey = note.key;
      html += cardHtml(note);
    });

    els.list.innerHTML = html + pager;
    applyLightbox();
  }

  function renderAll() {
    renderStats();
    renderTags();
    renderHeatmap();
    renderList();
  }

  // 兜底：外部 CDN 可能加载较慢，页面资源全就绪后再挂一次
  window.addEventListener('load', applyLightbox);

  /* ---------- 事件绑定 ---------- */

  // 侧栏收起 / 展开。
  // 右下角那颗按钮在页面内容之后才渲染，所以用事件委托 + 用时再取，避免拿不到节点
  function getRsideToggle() {
    return document.getElementById('lumina-sidebar-toggle');
  }

  function syncSidebarToggle() {
    var btn = getRsideToggle();
    if (!btn) return;
    btn.classList.toggle('is-on', !app.classList.contains('lumina-collapsed'));
  }

  function toggleSidebar(collapsed) {
    app.classList.toggle('lumina-collapsed', collapsed);
    syncSidebarToggle();
  }

  function onDocClickRsideToggle(e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    if (!e.target.closest('#lumina-sidebar-toggle')) return;
    toggleSidebar(!app.classList.contains('lumina-collapsed'));
  }

  document.addEventListener('click', onDocClickRsideToggle);
  window.setTimeout(syncSidebarToggle, 0);

  if (els.sidebarToggle) {
    els.sidebarToggle.addEventListener('click', function () {
      toggleSidebar(true);
    });
  }

  if (els.sidebarRestore) {
    els.sidebarRestore.addEventListener('click', function () {
      toggleSidebar(false);
    });
  }

  // 菜单
  [els.menuAll, els.menuDaily, els.menuWeek].forEach(function (el, index) {
    if (!el) return;
    el.addEventListener('click', function () {
      setView(['all', 'daily', 'week'][index]);
    });
  });

  // 标签点击（侧栏 + 正文内联）
  app.addEventListener('click', function (e) {
    var tagEl = e.target.closest('[data-tag]');
    if (!tagEl) return;
    var name = tagEl.getAttribute('data-tag');
    state.tag = state.tag === name ? '' : name;
    state.view = 'all';
    state.day = '';
    state.page = 1;
    updateMenu();
    renderTags();
    renderHeatmap();
    renderList();
  });

  // 顶部信息条按钮 + 分页
  els.list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (btn) {
      var act = btn.getAttribute('data-act');
      if (act === 'home') setView('all');
      else if (act === 'shuffle') setView('daily');
      return;
    }

    var pageBtn = e.target.closest('.lumina-pager-btn');
    if (pageBtn) {
      if (pageBtn.classList.contains('disabled') || pageBtn.classList.contains('active')) return;
      var target = parseInt(pageBtn.getAttribute('data-page'), 10);
      if (!isNaN(target)) goPage(target);
    }
  });

  /* ---------- 启动 ---------- */

  // 图片加载后卡片高度会变，重新配平瀑布流
  var relayoutTimer = 0;
  function onListImageLoad(e) {
    if (!masonry) return;
    if (!e.target || e.target.tagName !== 'IMG') return;
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(balanceMasonry, 120);
  }
  els.list.addEventListener('load', onListImageLoad, true);

  // 视口跨过移动端断点时重排（移动端强制单栏）
  var isMobileMode = window.innerWidth <= MOBILE_MAX;
  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var next = window.innerWidth <= MOBILE_MAX;
      if (next === isMobileMode) return;
      isMobileMode = next;
      renderList();
    }, 150);
  }
  window.addEventListener('resize', onResize);

  updateMenu();
  renderAll();
  bindHeatmap();

  // pjax 离开时清掉挂在 body 上的浮层与监听
  function cleanup() {
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    clearTimeout(relayoutTimer);
    clearTimeout(resizeTimer);
    els.list.removeEventListener('load', onListImageLoad, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('click', onDocClickRsideToggle);
    window.removeEventListener('load', applyLightbox);
    document.removeEventListener('pjax:send', cleanup);
  }
  document.addEventListener('pjax:send', cleanup);
})();
