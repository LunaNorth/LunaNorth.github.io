/**
 * 侧边栏日历 + 节日进度卡片(基于 June 方案,按本站体系适配)
 * 农历库:chinese-lunar(本地自托管 /js/chinese-lunar.js)
 * 本文件经 inject.bottom 一次性加载,监听 DOMContentLoaded 与 pjax:complete 重绘
 */
document.addEventListener('DOMContentLoaded', initializeCard)
document.addEventListener('pjax:complete', initializeCard)

let year, month, week, date, dates, weekStr, monthStr, asideTime, yearDays

function initializeCard() {
    cardTimes()
    cardRefreshTimes()
}

function getNextFestivalDate() {
    const now = new Date()
    const currentYear = now.getFullYear()

    // 阳历节日
    const solarFestivals = [
        { name: '元旦', month: 1, day: 1 },
        { name: '清明节', month: 4, day: 4 },
        { name: '劳动节', month: 5, day: 1 },
        { name: '国庆节', month: 10, day: 1 },
        { name: '圣诞节', month: 12, day: 25 }
    ]

    // 农历节日
    const lunarFestivals = [
        { name: '春节', month: 1, day: 1 },
        { name: '端午节', month: 5, day: 5 },
        { name: '中秋节', month: 8, day: 15 }
    ]

    const upcoming = []

    // 处理阳历节日(今年 + 明年)
    ;[currentYear, currentYear + 1].forEach(function (y) {
        solarFestivals.forEach(function (f) {
            const festDate = new Date(y, f.month - 1, f.day)
            if (festDate >= now) upcoming.push({ name: f.name, date: festDate })
        })
    })

    // 处理农历节日(今年 + 明年)
    ;[currentYear, currentYear + 1].forEach(function (y) {
        lunarFestivals.forEach(function (f) {
            const solar = typeof chineseLunar !== 'undefined' ? chineseLunar.lunarToSolar(y, f.month, f.day) : null
            if (!solar) return
            const festDate = new Date(solar.getFullYear(), solar.getMonth(), solar.getDate())
            if (festDate >= now) upcoming.push({ name: f.name, date: festDate })
        })
    })

    // 排序并返回最近节日
    if (upcoming.length === 0) return null
    return upcoming.sort(function (a, b) { return a.date - b.date })[0]
}

function cardRefreshTimes() {
    const e = document.getElementById('card-schedule')
    if (!e) return

    const now = new Date()
    const asideDay = (now - asideTime) / 86400000

    // 本年进度(闰年 366 天动态修正)
    const yearBar = e.querySelector('#pBar_year')
    const yearPct = Math.min((asideDay / yearDays) * 100, 100).toFixed(1)
    yearBar.max = yearDays
    yearBar.value = Math.min(asideDay, yearDays)
    e.querySelector('#p_span_year').innerText = yearPct + '%'
    e.querySelector('.schedule-item:nth-child(1) .aside-span2 a').innerText = Math.max(0, (yearDays - asideDay)).toFixed(0) + ' 天'

    // 本月进度
    const monthBar = e.querySelector('#pBar_month')
    const monthPct = ((date / dates) * 100).toFixed(1)
    monthBar.max = dates
    monthBar.value = date
    e.querySelector('#p_span_month').innerText = monthPct + '%'
    e.querySelector('.schedule-item:nth-child(2) .aside-span2 a').innerText = (dates - date) + ' 天'

    // 本周进度
    const wd = week === 0 ? 7 : week
    const weekBar = e.querySelector('#pBar_week')
    const weekPct = ((wd / 7) * 100).toFixed(1)
    weekBar.value = wd
    weekBar.max = 7
    e.querySelector('#p_span_week').innerText = weekPct + '%'
    e.querySelector('.schedule-item:nth-child(3) .aside-span2 a').innerText = (7 - wd) + ' 天'
}

function cardTimes() {
    const getShanghaiMidnight = (date = new Date()) => {
        const shanghaiStr = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        return new Date(shanghaiStr.split(' ')[0] + ' 00:00:00')
    }

    const shanghaiNow = getShanghaiMidnight()
    year = shanghaiNow.getFullYear()
    month = shanghaiNow.getMonth()
    week = shanghaiNow.getDay()
    date = shanghaiNow.getDate()

    monthStr = `${month + 1}月`
    weekStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][week]
    dates = [
        31,
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ][month]

    asideTime = new Date(`${year}/01/01 00:00:00`)
    yearDays = Math.round((new Date(year, 11, 31) - asideTime) / 86400000) + 1

    // 1月1日为第1天
    const asideDayNum = Math.ceil((shanghaiNow - asideTime) / 86400000) + 1
    const jan1Dow = new Date(year, 0, 1).getDay()
    const weekNum = Math.floor((asideDayNum - 1 + jan1Dow) / 7) + 1

    const calendar = document.getElementById('card-calendar')
    if (calendar) {
        calendar.querySelector('#calendar-week').innerHTML = `${year.toString().slice(-2)}年${monthStr}&nbsp;${weekStr}`
        calendar.querySelector('#calendar-date').innerHTML = String(date).padStart(2, '0')
        calendar.querySelector('#calendar-solar').innerHTML = `第${weekNum}周 第${asideDayNum}天`

        // 农历行:库缺失时静默降级
        if (typeof chineseLunar !== 'undefined') {
            const lunarDate = chineseLunar.solarToLunar(shanghaiNow)
            // format('T') 自带"年"字,去掉避免与生肖后重复
            const ganzhiYear = chineseLunar.format(lunarDate, 'T').replace(/年$/, '')
            const animalYear = chineseLunar.format(lunarDate, 'A')
            const lunarMonthStr = chineseLunar.format(lunarDate, 'M')
            const lunarDayStr = chineseLunar.format(lunarDate, 'd')
            calendar.querySelector('#calendar-lunar').innerHTML = `${ganzhiYear}${animalYear}年 ${lunarMonthStr}${lunarDayStr}`
        } else {
            calendar.querySelector('#calendar-lunar').innerHTML = ''
        }
    }

    const schedule = document.getElementById('card-schedule')
    if (schedule) {
        const nextFestival = getNextFestivalDate()
        if (nextFestival) {
            const diffDays = Math.ceil((nextFestival.date - shanghaiNow) / 86400000)
            schedule.querySelector('#schedule-title').innerText = `距离${nextFestival.name}`
            schedule.querySelector('#schedule-date').innerText = formatDateYMD(nextFestival.date)
            schedule.querySelector('#schedule-days').innerText = diffDays
        } else {
            schedule.querySelector('#schedule-title').innerText = '距离节日'
            schedule.querySelector('#schedule-days').innerText = '—'
        }
    }

    renderCalendarGrid()
}

function formatDateYMD(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function renderCalendarGrid() {
    const container = document.querySelector('#calendar-main')
    if (!container) return

    container.innerHTML = ''

    // 星期表头
    const headDiv = document.createElement('div')
    headDiv.className = 'calendar-rh'
    ;['日', '一', '二', '三', '四', '五', '六'].forEach(function (w, j) {
        const cell = document.createElement('div')
        cell.className = `calendar-d${j}`
        const a = document.createElement('a')
        a.textContent = w
        cell.appendChild(a)
        headDiv.appendChild(cell)
    })
    container.appendChild(headDiv)

    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const totalCells = firstDayOfMonth + dates
    const totalRows = Math.ceil(totalCells / 7)

    let currentDay = 1

    for (let i = 0; i < totalRows; i++) {
        const rowDiv = document.createElement('div')
        rowDiv.className = `calendar-r${i}`

        for (let j = 0; j < 7; j++) {
            const cellIndex = i * 7 + j
            const cellDiv = document.createElement('div')
            cellDiv.className = `calendar-d${j}`
            const a = document.createElement('a')

            if (cellIndex >= firstDayOfMonth && currentDay <= dates) {
                a.textContent = currentDay
                if (currentDay === date) a.classList.add('now')
                currentDay++
            } else {
                a.innerHTML = '&nbsp;'
            }

            cellDiv.appendChild(a)
            rowDiv.appendChild(cellDiv)
        }

        container.appendChild(rowDiv)
    }
}
