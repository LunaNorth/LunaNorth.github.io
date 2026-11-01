/**
 * 体态页：阶段状态 + 走势图
 *
 * 为什么放浏览器端：
 *   「进行中 / 已结束 / 未开始」和「还剩 N 天」必须按当天日期实时算，
 *   Hexo 构建时算出来的第二天就错了。
 * 走势图也必须在这里画：构建时拿不到容器的真实像素宽度。
 *
 * 卡片结构见 themes/butterfly/layout/includes/page/fitness.pug
 *   数据在 .fit-card 的 data-start / data-end / data-weight-series / data-fat-series 上
 *
 * 不加 data-pjax：脚本常驻，靠 pjax:complete 重新渲染
 */
;(() => {
  'use strict'

  const DAY = 86400000
  const SVG_NS = 'http://www.w3.org/2000/svg'

  const toDate = (str) => {
    const [y, m, d] = String(str).split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const diffDays = (from, to) => Math.round((to - from) / DAY)

  const today = () => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }

  const parseSeries = (str) =>
    String(str || '')
      .split(',')
      .map((v) => Number(v))
      .filter((v) => isFinite(v))

  /* ---------- 阶段状态：徽章文案 + 剩余天数 + 卡片配色类 ---------- */
  function renderStatus (card, now) {
    const start = toDate(card.dataset.start)
    const end = toDate(card.dataset.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    const badgeEl = card.querySelector('.fit-badge')
    const leftEl = card.querySelector('.fit-left')

    let state = 'is-active'
    let badge = '进行中'
    let leftText = ''

    if (now < start) {
      state = 'is-pending'
      badge = '未开始'
      leftText = `${diffDays(now, start)} 天后开始`
    } else if (now > end) {
      state = 'is-done'
      badge = '已结束'
      leftText = '已结束'
    } else {
      state = 'is-active'
      const left = diffDays(now, end)
      leftText = left === 0 ? '今天最后一天' : `还剩 ${left} 天`
    }

    card.classList.add(state)
    if (badgeEl) badgeEl.textContent = badge
    if (leftEl) leftEl.textContent = leftText
  }

  /* ---------- 走势图：一行一条线，各自归一化 ---------- */
  // 两条线共用一个纵轴会把它们压到一起（体重 70 多、体脂 20 多，量级不同），
  // 所以拆成两行、各自取自己的最大最小值，形状才看得清。
  function drawSpark (card) {
    const rows = card.querySelectorAll('.fit-spark-row')
    if (!rows.length) return

    rows.forEach((row) => {
      const box = row.querySelector('.fit-spark-canvas')
      if (!box) return

      const cls = row.classList.contains('is-fat') ? 'is-fat' : 'is-weight'
      const values = parseSeries(box.dataset.series)

      box.innerHTML = ''
      if (values.length < 2) return

      const width = box.clientWidth
      const height = box.clientHeight || 32
      if (!width || width < 30) return

      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', cls === 'is-fat' ? '体脂走势' : '体重走势')

      const padX = 5
      const padY = 4
      const innerW = width - padX * 2
      const innerH = height - padY * 2

      const min = Math.min.apply(null, values)
      const max = Math.max.apply(null, values)
      const span = max - min || 1
      const step = innerW / (values.length - 1)

      const pts = values.map((v, i) => {
        const x = padX + step * i
        const y = padY + (1 - (v - min) / span) * innerH
        return [x, y]
      })

      const d = pts
        .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
        .join(' ')

      // 只有体重铺淡色面积，两条都铺会糊成一片
      if (cls === 'is-weight') {
        const area = document.createElementNS(SVG_NS, 'path')
        const lastX = pts[pts.length - 1][0].toFixed(1)
        const firstX = pts[0][0].toFixed(1)
        area.setAttribute('d', `${d} L${lastX} ${height} L${firstX} ${height} Z`)
        area.setAttribute('class', `fit-spark-area ${cls}`)
        svg.appendChild(area)
      }

      const line = document.createElementNS(SVG_NS, 'path')
      line.setAttribute('d', d)
      line.setAttribute('class', `fit-spark-line ${cls}`)
      svg.appendChild(line)

      const endPoint = pts[pts.length - 1]
      const dot = document.createElementNS(SVG_NS, 'circle')
      dot.setAttribute('cx', endPoint[0].toFixed(1))
      dot.setAttribute('cy', endPoint[1].toFixed(1))
      dot.setAttribute('r', '2.2')
      dot.setAttribute('class', `fit-spark-dot ${cls}`)
      svg.appendChild(dot)

      box.appendChild(svg)
    })
  }

  function render () {
    const cards = document.querySelectorAll('.fit-card')
    if (!cards.length) return

    const now = today()
    cards.forEach((card) => {
      renderStatus(card, now)
      drawSpark(card)
    })
  }

  /* 窗口尺寸变了要重画：折线按像素坐标算，宽度变了会错位 */
  let resizeTimer = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      document.querySelectorAll('.fit-card').forEach(drawSpark)
    }, 160)
  })

  document.addEventListener('DOMContentLoaded', render)
  document.addEventListener('pjax:complete', render)
})()
