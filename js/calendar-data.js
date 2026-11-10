/* ==========================================================================
   万年历数据层（calendar-data.js）

   被 source/js/calendar.js（侧边栏日历 / 节日倒计时）使用。
   想加节日：直接在下面的数组里加一行即可，不用改渲染代码。

   三类节日：
     SOLAR_FESTIVALS    公历固定日期（month + day）
     FLOATING_FESTIVALS 公历浮动日期（某月第 n 个周 x，weekday 0 = 周日）
     LUNAR_FESTIVALS    农历日期（month + day，day 写 'last' 表示当月最后一天，如除夕）

   加 minor: true 表示"纪念日"：日历格子里不打点，也不参与倒计时。
   24 节气按天文算法实时算，不用手写表；清明本身是节气，所以不在公历节日里重复写。
   放假安排按年份写在 HOLIDAY_PLAN 里，每年国务院通知出来后补一条即可。
   ========================================================================== */
;(function (global) {
  'use strict'

  /* ---------- 公历固定节日 ---------- */
  var SOLAR_FESTIVALS = [
    { month: 1, day: 1, name: '元旦' },
    { month: 2, day: 14, name: '情人节' },
    { month: 3, day: 8, name: '妇女节', minor: true },
    { month: 3, day: 12, name: '植树节', minor: true },
    { month: 4, day: 1, name: '愚人节', minor: true },
    { month: 5, day: 1, name: '劳动节' },
    { month: 5, day: 4, name: '青年节', minor: true },
    { month: 6, day: 1, name: '儿童节' },
    { month: 7, day: 1, name: '建党节', minor: true },
    { month: 8, day: 1, name: '建军节', minor: true },
    { month: 9, day: 10, name: '教师节' },
    { month: 10, day: 1, name: '国庆节' },
    { month: 10, day: 31, name: '万圣夜', minor: true },
    { month: 11, day: 11, name: '光棍节', minor: true },
    { month: 12, day: 10, name: '世界人权日', minor: true },
    { month: 12, day: 24, name: '平安夜' },
    { month: 12, day: 25, name: '圣诞节' }
  ]

  /* ---------- 浮动公历节日（第 n 个周 x） ---------- */
  var FLOATING_FESTIVALS = [
    { month: 5, week: 2, weekday: 0, name: '母亲节' },
    { month: 6, week: 3, weekday: 0, name: '父亲节' },
    { month: 11, week: 4, weekday: 4, name: '感恩节' }
  ]

  /* ---------- 农历节日 ---------- */
  var LUNAR_FESTIVALS = [
    { month: 1, day: 1, name: '春节' },
    { month: 1, day: 15, name: '元宵节' },
    { month: 2, day: 2, name: '龙抬头', minor: true },
    { month: 5, day: 5, name: '端午节' },
    { month: 7, day: 7, name: '七夕', minor: true },
    { month: 7, day: 15, name: '中元节', minor: true },
    { month: 8, day: 15, name: '中秋节' },
    { month: 9, day: 9, name: '重阳节' },
    { month: 12, day: 8, name: '腊八节' },
    { month: 12, day: 23, name: '小年', minor: true },
    { month: 12, day: 'last', name: '除夕' }
  ]

  /* ---------- 24 节气 ---------- */
  // 从小寒开始，每 15° 太阳黄经一个节气：小寒 285° → 冬至 270°
  var TERM_NAMES = ('小寒,大寒,立春,雨水,惊蛰,春分,清明,谷雨,立夏,小满,芒种,夏至,' +
    '小暑,大暑,立秋,处暑,白露,秋分,寒露,霜降,立冬,小雪,大雪,冬至').split(',')

  var RAD = Math.PI / 180

  // 太阳视黄经（度）。Meeus《天文算法》第 25 章低精度公式，
  // 1900–2100 年误差 < 0.01°（约 15 分钟），比"每年固定 365.2422 天"的查表公式稳得多。
  function solarLongitude (jd) {
    var t = (jd - 2451545.0) / 36525
    var l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
    var m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
    var c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * RAD) +
      (0.019993 - 0.000101 * t) * Math.sin(2 * m * RAD) +
      0.000289 * Math.sin(3 * m * RAD)
    var omega = 125.04 - 1934.136 * t
    // 章动 + 光行差修正到"视黄经"
    var lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD)
    return ((lambda % 360) + 360) % 360
  }

  // a - b 归一到 (-180, 180]，避免 0° / 360° 附近回绕
  function angleDiff (a, b) {
    return ((a - b) % 360 + 540) % 360 - 180
  }

  function jdOfDate (year, month, day) {
    return Date.UTC(year, month - 1, day) / 86400000 + 2440587.5
  }

  // 第 index 个节气的北京时间（毫秒时间戳）
  function termTime (year, index) {
    var target = (285 + index * 15) % 360
    // 初值：小寒约在 1 月 5 日，之后每个节气约 15.22 天
    var jd = jdOfDate(year, 1, 5) + index * 15.2184

    // 牛顿迭代：太阳每天走约 0.9856°，几次就收敛
    for (var i = 0; i < 8; i++) {
      jd += angleDiff(target, solarLongitude(jd)) / 0.98564736
    }

    return (jd - 2440587.5) * 86400000 + 8 * 3600000 // UT → 北京时间
  }

  // 第 index 个节气在第 year 年的"日"（1-31），月份 = floor(index / 2) + 1
  function termDay (year, index) {
    return new Date(termTime(year, index)).getUTCDate()
  }

  /* ---------- 放假安排（休 / 班） ---------- */
  // off：放假区间，写法 '起始~结束'（或单日）；work：调休上班日
  var HOLIDAY_PLAN = {
    2026: {
      off: [
        '2026-01-01~2026-01-03',
        '2026-02-15~2026-02-23',
        '2026-04-04~2026-04-06',
        '2026-05-01~2026-05-05',
        '2026-06-19~2026-06-21',
        '2026-09-25~2026-09-27',
        '2026-10-01~2026-10-07'
      ],
      work: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10']
    }
  }

  // 格子里的短名：优先去掉尾字"节"，再查特例表（侧边栏一格只有 20 多像素）
  var SHORT_NAMES = { 平安夜: '平安', 万圣夜: '万圣', 世界人权日: '人权日' }

  function shortName (name) {
    if (SHORT_NAMES[name]) return SHORT_NAMES[name]
    if (name.length > 2 && /节$/.test(name)) return name.slice(0, -1)
    return name
  }

  var DAY = 86400000

  function pad (n) {
    return String(n).padStart(2, '0')
  }

  function ymd (date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
  }

  function startOfDay (date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function hasLunar () {
    return !!(global.chineseLunar && global.chineseLunar.solarToLunar)
  }

  // 某年的 24 节气，返回 [{ month, day, name }]
  function termsOfYear (year) {
    var list = []
    for (var i = 0; i < 24; i++) {
      list.push({ month: Math.floor(i / 2) + 1, day: termDay(year, i), name: TERM_NAMES[i] })
    }
    return list
  }

  // 第 n 个周 x 落在哪一天；weekday 0 = 周日
  function nthWeekday (year, month, week, weekday) {
    var first = new Date(year, month - 1, 1)
    var offset = (weekday - first.getDay() + 7) % 7
    return new Date(year, month - 1, 1 + offset + (week - 1) * 7)
  }

  // 农历节日 → 公历日期；day 为 'last' 时取当月最后一天（除夕）
  // 月初一减去一天就是月末，比查"这个月有几天"稳妥（库里的 daysOfMonth 有兼容问题）
  function lunarFestivalDate (lunarYear, item) {
    if (!hasLunar()) return null
    var lunar = global.chineseLunar

    if (item.day === 'last') {
      var nextYear = item.month === 12 ? lunarYear + 1 : lunarYear
      var nextMonth = item.month === 12 ? 1 : item.month + 1
      try {
        return new Date(startOfDay(lunar.lunarToSolar(nextYear, nextMonth, 1)) - DAY)
      } catch (error) {
        return null
      }
    }

    try {
      return startOfDay(lunar.lunarToSolar(lunarYear, item.month, item.day))
    } catch (error) {
      return null
    }
  }

  // 某年所有节日：[{ date, name, minor, kind }]
  // 春节 / 除夕 这类跨农历年的，用 lunarYear - 1 ~ +1 生成再按公历年过滤
  function festivalsOfYear (year) {
    var list = []
    var from = new Date(year, 0, 1)
    var to = new Date(year, 11, 31)

    SOLAR_FESTIVALS.forEach(function (item) {
      list.push({
        date: new Date(year, item.month - 1, item.day),
        name: item.name,
        minor: !!item.minor,
        kind: 'solar'
      })
    })

    FLOATING_FESTIVALS.forEach(function (item) {
      list.push({
        date: nthWeekday(year, item.month, item.week, item.weekday),
        name: item.name,
        minor: !!item.minor,
        kind: 'solar'
      })
    })

    ;[year - 1, year, year + 1].forEach(function (lunarYear) {
      LUNAR_FESTIVALS.forEach(function (item) {
        var date = lunarFestivalDate(lunarYear, item)
        if (!date || date < from || date > to) return
        list.push({ date: date, name: item.name, minor: !!item.minor, kind: 'lunar' })
      })
    })

    // 清明是节气，不写死在公历节日里，避免每年差一天
    termsOfYear(year).forEach(function (term) {
      if (term.name !== '清明') return
      list.push({
        date: new Date(year, term.month - 1, term.day),
        name: '清明节',
        minor: false,
        kind: 'term'
      })
    })

    list.sort(function (a, b) {
      return a.date - b.date
    })

    return list
  }

  // 某天的节气名（不是节气返回 ''）
  function termOfDate (date) {
    var terms = termsOfYear(date.getFullYear())
    var target = ymd(date)
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i]
      if (ymd(new Date(date.getFullYear(), term.month - 1, term.day)) === target) return term.name
    }
    return ''
  }

  // 放假安排：返回 'off'（休）/ 'work'（班）/ ''
  function holidayOf (date) {
    var plan = HOLIDAY_PLAN[date.getFullYear()]
    if (!plan) return ''

    var target = ymd(date)

    if ((plan.work || []).indexOf(target) !== -1) return 'work'

    var off = plan.off || []
    for (var i = 0; i < off.length; i++) {
      var range = String(off[i]).split('~')
      var start = range[0]
      var end = range[1] || range[0]
      if (target >= start && target <= end) return 'off'
    }

    return ''
  }

  // ISO 8601 周数（周一为一周开始，与手机日历一致）
  function isoWeek (date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    var dayNum = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - dayNum + 3)
    var firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
    var firstDayNum = (firstThursday.getUTCDay() + 6) % 7
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
    return 1 + Math.round((d - firstThursday) / (7 * DAY))
  }

  // 数九：冬至当天起每 9 天进一个九，返回 '一九' ~ '九九'，不在数九期返回 ''
  function nineOf (date) {
    var day = startOfDay(date)
    var names = ['一九', '二九', '三九', '四九', '五九', '六九', '七九', '八九', '九九']
    var candidates = [date.getFullYear(), date.getFullYear() - 1]

    for (var c = 0; c < candidates.length; c++) {
      var winterSolstice = null
      termsOfYear(candidates[c]).forEach(function (term) {
        if (term.name !== '冬至') return
        winterSolstice = new Date(candidates[c], term.month - 1, term.day)
      })
      if (!winterSolstice) continue

      var diff = Math.round((day - winterSolstice) / DAY)
      // 一个数九期共 81 天（九九最后一天）
      if (diff >= 0 && diff <= 80) return names[Math.floor(diff / 9)]
    }

    return ''
  }

  global.CalendarData = {
    termsOfYear: termsOfYear,
    termTime: termTime,
    festivalsOfYear: festivalsOfYear,
    termOfDate: termOfDate,
    holidayOf: holidayOf,
    isoWeek: isoWeek,
    nineOf: nineOf,
    shortName: shortName,
    ymd: ymd,
    startOfDay: startOfDay
  }
})(window)
