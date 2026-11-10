;(function () {
  'use strict'

  // 侧边栏日历 / 节日倒计时卡片
  // 节日、节气、放假安排来自 calendar-data.js；农历换算依赖 chinese-lunar.js。
  // 两个依赖都缺失时卡片仍能显示公历与进度，只是没有农历 / 节日标记。

  var TIME_ZONE = 'Asia/Shanghai'
  var DAY = 86400000
  var WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  function data () {
    return window.CalendarData || null
  }

  // 取上海时区的「今天」，返回本地时区的零点，避免访客在其它时区时日期错位
  function getToday () {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date())

    var map = {}
    parts.forEach(function (part) {
      map[part.type] = part.value
    })

    return new Date(Number(map.year), Number(map.month) - 1, Number(map.day))
  }

  function daysInMonth (year, month) {
    return new Date(year, month + 1, 0).getDate()
  }

  function isLeapYear (year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }

  function formatYMD (date) {
    var month = String(date.getMonth() + 1).padStart(2, '0')
    var day = String(date.getDate()).padStart(2, '0')
    return date.getFullYear() + '-' + month + '-' + day
  }

  // 当月每天对应的标记：{ '2026-12-25': { name, short, kind } }
  // 同一天既有节气又有节日时，节日优先（例如清明：节气名让位给"清明节"）
  function buildEventMap (year) {
    var map = {}
    var D = data()
    if (!D) return map

    D.termsOfYear(year).forEach(function (term) {
      map[D.ymd(new Date(year, term.month - 1, term.day))] = {
        name: term.name,
        short: term.name,
        kind: 'term'
      }
    })

    D.festivalsOfYear(year).forEach(function (festival) {
      if (festival.minor) return
      map[D.ymd(festival.date)] = {
        name: festival.name,
        short: D.shortName(festival.name),
        kind: 'fest'
      }
    })

    return map
  }

  // 找最近的节日 / 节气（今年 + 明年），纪念日不参与倒计时
  function findNextEvent (today) {
    var D = data()
    if (!D) return null

    var year = today.getFullYear()
    var list = []

    ;[year, year + 1].forEach(function (y) {
      D.festivalsOfYear(y).forEach(function (festival) {
        if (festival.minor) return
        if (festival.date >= today) list.push({ name: festival.name, date: festival.date })
      })

      D.termsOfYear(y).forEach(function (term) {
        var date = new Date(y, term.month - 1, term.day)
        if (date >= today) list.push({ name: term.name, date: date })
      })
    })

    if (!list.length) return null

    list.sort(function (a, b) {
      return a.date - b.date
    })

    // 同一天既有节日又有节气时，优先显示节日
    var first = list[0]
    for (var i = 0; i < list.length; i++) {
      if (list[i].date - first.date === 0 && list[i].name.length > first.name.length) {
        first = list[i]
      }
    }

    return first
  }

  function setText (id, value) {
    var el = document.getElementById(id)
    if (el) el.textContent = value
  }

  // 日历网格：7 列，空位补占位格，当天高亮，节日 / 节气带小字标记
  function renderCalendarGrid (today) {
    var container = document.getElementById('calendar-main')
    if (!container) return

    var year = today.getFullYear()
    var month = today.getMonth()
    var todayDate = today.getDate()
    var firstWeekday = new Date(year, month, 1).getDay()
    var totalDays = daysInMonth(year, month)
    var cells = Math.ceil((firstWeekday + totalDays) / 7) * 7
    var events = buildEventMap(year)
    var html = ''

    for (var i = 0; i < cells; i++) {
      if (i % 7 === 0) html += '<div class="calendar-row">'

      var day = i - firstWeekday + 1
      if (day >= 1 && day <= totalDays) {
        var key = formatYMD(new Date(year, month, day))
        var event = events[key]
        var cls = []

        if (day === todayDate) cls.push('now')
        if (event) cls.push(event.kind === 'fest' ? 'is-fest' : 'is-term')

        html += '<a' +
          (cls.length ? ' class="' + cls.join(' ') + '"' : '') +
          ' title="' + key + (event ? ' ' + event.name : '') + '"' +
          ' data-day="' + key + '">' +
          '<span class="cal-d">' + day + '</span>' +
          // 没有标记的日子也留一个空 em，保证各行数字垂直对齐
          '<em class="cal-m">' + (event ? event.short : '') + '</em>' +
          '</a>'
      } else {
        html += '<a class="empty"></a>'
      }

      if (i % 7 === 6) html += '</div>'
    }

    container.innerHTML = html
  }

  // 进度条 + 百分比 + 剩余天数
  function updateProgress (key, value, max) {
    var bar = document.getElementById('pBar_' + key)
    if (bar) {
      bar.max = max
      bar.value = value
    }

    var percent = document.getElementById('p_span_' + key)
    if (percent) percent.textContent = (value / max * 100).toFixed(1) + '%'

    var row = bar ? bar.closest('.schedule-row') : null
    var rest = row ? row.querySelector('.schedule-rest a') : null
    if (rest) rest.textContent = max - value
  }

  function renderCalendar () {
    var today = getToday()
    var year = today.getFullYear()
    var month = today.getMonth()
    var date = today.getDate()
    var weekday = today.getDay()
    var monthDays = daysInMonth(year, month)
    var dayOfYear = Math.round((today - new Date(year, 0, 1)) / DAY) + 1
    var yearDays = isLeapYear(year) ? 366 : 365
    var D = data()

    // 第几周用 ISO 标准（周一为一周开始），和手机日历对得上
    var weekOfYear = D ? D.isoWeek(today) : Math.ceil(dayOfYear / 7)

    setText('calendar-week', String(year).slice(-2) + '年' + (month + 1) + '月 ' + WEEK_NAMES[weekday])
    setText('calendar-date', String(date).padStart(2, '0'))
    setText('calendar-solar', '第' + weekOfYear + '周 第' + dayOfYear + '天')

    var lunarEl = document.getElementById('calendar-lunar')
    if (lunarEl && window.chineseLunar) {
      try {
        var lunar = window.chineseLunar.solarToLunar(today)
        lunarEl.textContent = window.chineseLunar.format(lunar, 'T').replace(/年$/, '') +
          window.chineseLunar.format(lunar, 'A') + '年 ' +
          window.chineseLunar.format(lunar, 'M') +
          window.chineseLunar.format(lunar, 'd')
      } catch (error) {
        lunarEl.textContent = ''
      }
    }

    renderCalendarGrid(today)

    var event = findNextEvent(today)
    if (event) {
      var diff = Math.round((event.date - today) / DAY)
      var daysEl = document.getElementById('schedule-days')
      var unitEl = document.getElementById('schedule-unit')

      if (diff === 0) {
        // 今天就是节日：大数字换成"今天"，去掉后面的"天"
        setText('schedule-title', '今天是' + event.name)
        setText('schedule-days', '今天')
        if (daysEl) daysEl.classList.add('is-today')
        if (unitEl) unitEl.classList.add('is-hidden')
      } else {
        setText('schedule-title', '距离' + event.name)
        setText('schedule-days', diff)
        if (daysEl) daysEl.classList.remove('is-today')
        if (unitEl) unitEl.classList.remove('is-hidden')
      }

      setText('schedule-date', formatYMD(event.date))
    }

    updateProgress('year', dayOfYear, yearDays)
    updateProgress('month', date, monthDays)
    updateProgress('week', weekday === 0 ? 7 : weekday, 7)
  }

  function init () {
    // 侧边栏没有这两张卡片时直接跳过，避免在其它页面做无用计算
    if (!document.getElementById('card-calendar') && !document.getElementById('card-schedule')) return
    renderCalendar()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // 主题开启 pjax 时，页面切换后重新渲染
  document.addEventListener('pjax:complete', init)
})()
