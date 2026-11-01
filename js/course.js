/**
 * 课程学习页：课程状态 + 剩余天数
 *
 * 为什么放浏览器端：「学习中 / 已完成 / 未开始 / 已超期」和「还剩 N 天」
 * 都得按当天日期算，Hexo 构建时算出来的第二天就错了。
 * 进度百分比（done / total）不在这里算，那个构建时就定好了。
 *
 * 课程卡结构见 themes/butterfly/layout/includes/page/course.pug
 *   数据在 .course-card 的 data-start / data-end / data-progress 上
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

  function renderCard (card, now) {
    const start = toDate(card.dataset.start)
    const end = toDate(card.dataset.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    const progress = Number(card.dataset.progress) || 0
    const badgeEl = card.querySelector('.course-badge')
    const leftEl = card.querySelector('.course-left')

    let state = 'is-active'
    let badge = '学习中'
    let leftText = ''

    if (progress >= 100) {
      // 学完了就看进度，不用管日期有没有过
      state = 'is-done'
      badge = '已完成'
      leftText = '已学完'
    } else if (now > end) {
      state = 'is-overdue'
      badge = '已超期'
      leftText = `超出 ${diffDays(end, now)} 天`
    } else if (now < start) {
      state = 'is-pending'
      badge = '未开始'
      leftText = `${diffDays(now, start)} 天后开始`
    } else {
      state = 'is-active'
      const left = diffDays(now, end)
      leftText = left === 0 ? '今天截止' : `还剩 ${left} 天`
    }

    card.classList.add(state)
    if (badgeEl) badgeEl.textContent = badge
    if (leftEl) leftEl.textContent = leftText
  }

  function render () {
    const cards = document.querySelectorAll('.course-card')
    if (!cards.length) return

    const now = today()
    cards.forEach((card) => renderCard(card, now))
  }

  document.addEventListener('DOMContentLoaded', render)
  document.addEventListener('pjax:complete', render)
})()
