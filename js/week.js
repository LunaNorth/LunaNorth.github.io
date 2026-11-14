/* ==========================================================================
   本周页（/week/）
   --------------------------------------------------------------------------
   数据由 includes/page/week.pug 在构建时打包进 #week-data，这里负责：

     1. 把文章 + 碎碎念按「周一 ~ 周日」归到各个周里
     2. 有记录的周各占一张可折叠的卡片，本周默认展开，其余默认折叠
     3. 顶部三张进行中的卡：约定（challenge）/ 打卡（habit）/ 体态（health）
     4. 随机抽一句旧话，「换一句」按钮再抽

   为什么全放浏览器端：本周的边界、第几天、还剩几天每天都会变，
   构建时算出来隔天打开就是错的（和 habit.js / health.js 一个道理）。
   ========================================================================== */

;(function () {
  'use strict'

  var box = document.getElementById('week')
  var dataEl = document.getElementById('week-data')
  if (!box || !dataEl) return

  var data
  try {
    data = JSON.parse(dataEl.textContent || '{}')
  } catch (err) {
    return
  }

  var DAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  var DAY_MS = 86400000

  function pad2 (n) {
    return String(n).padStart(2, '0')
  }

  function parse (s) {
    if (!s) return null
    var d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  function dayKey (d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  }

  function startOfDay (d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  // 周一算一周的第一天（中文习惯）
  function startOfWeek (d) {
    var t = startOfDay(d)
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7))
    return t
  }

  function addDays (d, n) {
    var t = new Date(d.getTime())
    t.setDate(t.getDate() + n)
    return t
  }

  // 只比到「天」，避免时分秒 / 夏令时把天数算歪
  function diffDays (a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)
  }

  function fmtMD (d) {
    return (d.getMonth() + 1) + '.' + pad2(d.getDate())
  }

  function fmtNum (n) {
    return n === null || n === undefined || !isFinite(n) ? '—' : Number(n).toFixed(1)
  }

  function clamp (n, min, max) {
    return Math.min(max, Math.max(min, n))
  }

  function esc (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  var today = new Date()
  var monday = startOfWeek(today)
  var thisWeekKey = dayKey(monday)

  var since = parse(data.since)

  // 建站第 N 周：拿起点所在周和某个周一比，差几周就是第几周
  function weekNoOf (weekMonday) {
    if (!since) return 0
    var no = Math.floor(diffDays(startOfWeek(since), weekMonday) / 7) + 1
    return no < 1 ? 1 : no
  }

  /* ---------------- 把记录按周归组 ---------------- */

  var items = []
  ;(data.posts || []).forEach(function (post) {
    var d = parse(post.at)
    if (d) items.push({ kind: 'post', date: d, title: post.title, url: post.url })
  })
  ;(data.notes || []).forEach(function (note) {
    var d = parse(note.at)
    if (d) items.push({ kind: 'note', date: d, text: note.text, where: note.where })
  })

  // 先整体按时间倒序，后面按天分组时天然就是「新的在上」
  items.sort(function (a, b) { return b.date - a.date })

  var weekMap = {}

  // 本周一定有一张卡（哪怕一条记录都没有），这样「这周还是空的」也看得见
  weekMap[thisWeekKey] = { monday: monday, items: [] }

  items.forEach(function (it) {
    var key = dayKey(startOfWeek(it.date))
    if (!weekMap[key]) weekMap[key] = { monday: startOfWeek(it.date), items: [] }
    weekMap[key].items.push(it)
  })

  // 本周排最前，其余按时间倒序；没有记录的周直接不出现
  var weekList = Object.keys(weekMap)
    .map(function (key) { return weekMap[key] })
    .filter(function (w) { return w.items.length || dayKey(w.monday) === thisWeekKey })
    .sort(function (a, b) { return b.monday - a.monday })

  /* ---------------- 单条记录 ---------------- */

  function renderItem (it) {
    var time = pad2(it.date.getHours()) + ':' + pad2(it.date.getMinutes())
    if (it.kind === 'post') {
      return '<li class="wk-item">' +
        '<span class="wk-time">' + time + '</span>' +
        '<span class="wk-tag wk-tag--post">文章</span>' +
        '<p class="wk-text"><a href="' + esc(it.url) + '">' + esc(it.title) + '</a></p>' +
        '</li>'
    }
    return '<li class="wk-item">' +
      '<span class="wk-time">' + time + '</span>' +
      '<span class="wk-tag">碎碎念</span>' +
      '<p class="wk-text">' + esc(it.text) +
      (it.where ? '<span class="wk-where">· ' + esc(it.where) + '</span>' : '') +
      '</p>' +
      '</li>'
  }

  /* ---------------- 一周的 7 天列表 ---------------- */

  // 本周：7 天全列出来，没记录的天写一句「这天没留下东西」
  // 往前的周：只列有记录的那几天，省得一堆空行
  function renderDays (week, full) {
    var groups = {}
    week.items.forEach(function (it) {
      var key = dayKey(it.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(it)
    })

    var rows = []
    var i
    for (i = 6; i >= 0; i--) {
      var day = addDays(week.monday, i)
      var list = groups[dayKey(day)] || []
      if (!list.length && !full) continue

      var classes = 'wk-day'
      if (dayKey(day) === dayKey(today)) classes += ' is-today'
      if (!list.length) classes += ' is-empty'

      rows.push('<div class="' + classes + '">' +
        '<div class="wk-day__date"><b>' + fmtMD(day) + '</b><span>' + DAY_CN[day.getDay()] + '</span></div>' +
        (list.length
          ? '<ul class="wk-day__items">' + list.map(renderItem).join('') + '</ul>'
          : '<p class="wk-empty">这天没留下东西</p>') +
        '</div>')
    }

    if (!rows.length) return '<p class="wk-empty wk-empty--week">这周还没留下东西。</p>'
    return rows.join('')
  }

  /* ---------------- 周卡片（折叠） ---------------- */

  function renderWeekCard (week) {
    var isThis = dayKey(week.monday) === thisWeekKey
    var sunday = addDays(week.monday, 6)
    var no = weekNoOf(week.monday)
    var count = week.items.length

    var meta = (isThis ? '本周' : (no ? '第 ' + no + ' 周' : '更早')) +
      ' · ' + (count ? count + ' 条记录' : '还没有记录')

    return '<section class="wk-wk' + (isThis ? ' is-open' : '') + '">' +
      '<button class="wk-wk__head" type="button" aria-expanded="' + (isThis ? 'true' : 'false') + '">' +
      '<span class="wk-wk__range"><b>' + fmtMD(week.monday) + ' 周一</b> — <b>' + fmtMD(sunday) + ' 周日</b></span>' +
      '<span class="wk-wk__meta">' + meta + '</span>' +
      '<span class="wk-wk__chev" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="wk-wk__body">' + renderDays(week, isThis) + '</div>' +
      '</section>'
  }

  var weeksBlock = '<div class="wk-weeks">' + weekList.map(renderWeekCard).join('') + '</div>'

  /* ---------------- 顶部：三张进行中的卡 ---------------- */

  // 0% 时不画空槽（看着像坏了），改成在起点画一个小圈，表示「还没起步」
  function bar (pct) {
    var w = clamp(pct, 0, 100)
    var cls = w <= 0 ? 'wk-bar is-empty' : 'wk-bar'
    return '<div class="' + cls + '"><span style="width: ' + w.toFixed(1) + '%"></span></div>'
  }

  var stats = []

  ;(data.habits || []).forEach(function (item) {
    var start = parse(item.start)
    var end = parse(item.end)

    if (item.type === 'challenge' && start && end) {
      var total = diffDays(start, end) + 1
      var waiting = diffDays(today, start)
      var left = diffDays(today, end)

      // 还没到开始日就显示「还有 N 天开始」，别写成「第 0 天」
      if (waiting > 0) {
        stats.push(
          '<div class="wk-stat">' +
          '<div class="wk-stat__label"><i class="fas fa-handshake-angle"></i>约定</div>' +
          '<div class="wk-stat__num">共 <b>' + total + '</b> 天 <span class="wk-unit">· 还有 ' + waiting + ' 天开始</span></div>' +
          bar(0) +
          '<div class="wk-stat__meta">从 ' + esc(item.start) + ' 起' +
          (item.note ? ' · ' + esc(item.note) : '') +
          '</div>' +
          '</div>'
        )
        return
      }

      var passed = clamp(diffDays(start, today) + 1, 0, total)
      stats.push(
        '<div class="wk-stat">' +
        '<div class="wk-stat__label"><i class="fas fa-handshake-angle"></i>约定</div>' +
        '<div class="wk-stat__num">第 <b>' + passed + '</b> / ' + total + ' 天</div>' +
        bar(total > 0 ? (passed / total) * 100 : 0) +
        '<div class="wk-stat__meta">' +
        (left >= 0 ? '还剩 ' + left + ' 天' : '已到期') +
        (item.note ? ' · ' + esc(item.note) : '') +
        '</div>' +
        '</div>'
      )
      return
    }

    if (start) {
      var waited = diffDays(today, start)
      var days = waited <= 0 ? diffDays(start, today) + 1 : 0
      var goal = item.goal || 21
      stats.push(
        '<div class="wk-stat">' +
        '<div class="wk-stat__label"><i class="fas fa-list-check"></i>打卡</div>' +
        '<div class="wk-stat__num">' +
        (waited > 0 ? '还有 ' + waited + ' 天开始' : '已坚持 <b>' + days + '</b> 天') +
        '</div>' +
        bar(Math.min(100, (days / goal) * 100)) +
        '<div class="wk-stat__meta">从 ' + esc(item.start) + ' 起' +
        (item.note ? ' · ' + esc(item.note) : '') +
        '</div>' +
        '</div>'
      )
    }
  })

  ;(data.fit || []).forEach(function (goal) {
    var records = goal.records || []
    if (!records.length) return

    var first = records[0]
    var last = records[records.length - 1]
    var startW = Number(first.w)
    var curW = Number(last.w)
    var pct = 0
    if (isFinite(startW) && isFinite(curW) && goal.goalW != null && startW > goal.goalW) {
      pct = clamp(((startW - curW) / (startW - goal.goalW)) * 100, 0, 100)
    }

    var curFat = last.f != null ? Number(last.f) : null
    var meta = []
    if (isFinite(startW) && isFinite(curW) && goal.goalW != null) {
      var gap = curW - goal.goalW
      meta.push(gap > 0 ? '还差 ' + gap.toFixed(1) + ' kg' : '已达成目标')
    }
    if (curFat != null) {
      meta.push('体脂 ' + curFat.toFixed(1) + '%' +
        (goal.goalF != null ? '（目标 ' + Number(goal.goalF).toFixed(1) + '%）' : ''))
    }
    meta.push('最近 ' + esc(last.d.slice(5)))

    stats.push(
      '<div class="wk-stat">' +
      '<div class="wk-stat__label"><i class="fas fa-weight-scale"></i>体态</div>' +
      '<div class="wk-stat__num">' + fmtNum(curW) + ' <span class="wk-unit">→ 目标 ' +
      fmtNum(goal.goalW) + ' kg</span></div>' +
      bar(pct) +
      '<div class="wk-stat__meta">' + meta.join(' · ') + '</div>' +
      '</div>'
    )
  })

  var statsBlock = stats.length ? '<div class="wk-stats">' + stats.join('') + '</div>' : ''

  /* ---------------- 一句旧话 ---------------- */

  var quotes = data.quotes || []

  function quoteHtml () {
    if (!quotes.length) return ''
    var item = quotes[Math.floor(Math.random() * quotes.length)]
    return '<div class="wk-quote">' +
      '<div class="wk-quote__mark">“</div>' +
      '<p class="wk-quote__text" data-quote-text>' + esc(item.text) + '</p>' +
      '<div class="wk-quote__from">' +
      (item.url ? '<a href="' + esc(item.url) + '" data-quote-from>来自「' + esc(item.from) + '」</a>' : '') +
      '<span class="wk-quote__refresh" role="button" tabindex="0"><i class="fas fa-rotate"></i> 换一句</span>' +
      '</div>' +
      '</div>'
  }

  /* ---------------- 拼装 ---------------- */

  box.innerHTML = statsBlock + weeksBlock + quoteHtml() +
    '<p class="wk-tip">本周默认展开，往前的周自己点开看；这页每周一自动翻页。</p>'

  /* ---------------- 折叠 / 展开 ---------------- */

  Array.prototype.forEach.call(box.querySelectorAll('.wk-wk__head'), function (head) {
    head.addEventListener('click', function () {
      var card = head.parentNode
      var open = card.classList.toggle('is-open')
      head.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  })

  /* ---------------- 换一句 ---------------- */

  var refresh = box.querySelector('.wk-quote__refresh')
  if (refresh && quotes.length > 1) {
    var roll = function () {
      var item = quotes[Math.floor(Math.random() * quotes.length)]
      var textEl = box.querySelector('[data-quote-text]')
      var fromEl = box.querySelector('[data-quote-from]')
      if (textEl) textEl.textContent = item.text
      if (fromEl) {
        fromEl.textContent = '来自「' + item.from + '」'
        fromEl.setAttribute('href', item.url)
      }
    }
    refresh.addEventListener('click', roll)
    refresh.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        roll()
      }
    })
  } else if (refresh) {
    refresh.style.display = 'none'
  }
})()
