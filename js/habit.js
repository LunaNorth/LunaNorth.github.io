/**
 * 打卡页：进度与天数计算
 *
 * 为什么放在浏览器端：日期进度每天都在变，Hexo 构建时算出来的到了第二天就是错的。
 *
 * 两类卡片（source/_data/habit.yml）：
 *   .habit-card.is-challenge  打卡计划，有 data-start / data-end
 *     算「第 N / 共 M 天」「还剩几天」、进度条宽度，并按状态打 is-active / is-done / is-pending
 *   .habit-card.is-habit      习惯养成，只有 data-start
 *     算「已经坚持 N 天」
 *
 * 不加 data-pjax：脚本常驻，靠 pjax:complete 重新渲染
 */
;(() => {
  'use strict'

  const DAY = 86400000

  const toDate = (str) => {
    const [y, m, d] = String(str).split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const diffDays = (from, to) => Math.round((to - from) / DAY)

  const today = () => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }

  function renderChallenge (card, now) {
    const start = toDate(card.dataset.start)
    const end = toDate(card.dataset.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    const total = diffDays(start, end) + 1
    if (total <= 0) return

    const badgeEl = card.querySelector('.habit-badge')
    const fillEl = card.querySelector('.habit-bar-fill')
    const dayEl = card.querySelector('.habit-day')
    const leftEl = card.querySelector('.habit-left')

    let passed = 0
    let percent = 0
    let badge = '进行中'
    let leftText = ''
    let state = 'is-active'

    if (now < start) {
      state = 'is-pending'
      badge = '未开始'
      leftText = `${diffDays(now, start)} 天后开始`
    } else if (now > end) {
      state = 'is-done'
      passed = total
      percent = 100
      badge = '已结束'
      leftText = '已走完'
    } else {
      passed = diffDays(start, now) + 1
      percent = Math.min(100, Math.round((passed / total) * 100))
      const left = diffDays(now, end)
      leftText = left === 0 ? '今天最后一天' : `还剩 ${left} 天`
    }

    card.classList.add(state)
    if (badgeEl) badgeEl.textContent = badge
    if (fillEl) fillEl.style.width = percent + '%'
    if (dayEl) dayEl.textContent = `第 ${passed} / ${total} 天`
    if (leftEl) leftEl.textContent = leftText
  }

  function renderHabit (card, now) {
    const start = toDate(card.dataset.start)
    if (isNaN(start.getTime())) return

    const days = Math.max(0, diffDays(start, now) + 1)
    const numEl = card.querySelector('.habit-num')
    if (numEl) numEl.textContent = days
    card.classList.add('is-active')
  }

  function render () {
    const now = today()
    document.querySelectorAll('.habit-card.is-challenge').forEach((card) => renderChallenge(card, now))
    document.querySelectorAll('.habit-card.is-habit').forEach((card) => renderHabit(card, now))
  }

  document.addEventListener('DOMContentLoaded', render)
  document.addEventListener('pjax:complete', render)
})()
