/**
 * 时光页：倒计时 / 纪念日 / 正计时天数计算
 *
 * 为什么不在构建时算：天数每天都在变，Hexo 构建时算出来的数字第二天就错了，
 * 必须放到浏览器端按当前日期实时算。
 *
 * 三类数据（source/_data/countdown.yml）：
 *   countdown   指向未来某天。还没到 → 还有 N 天；到当天 → 就是今天；过了 → 已过去 N 天
 *   anniversary 纪念日，每年循环。主数字 = 已经走过多少天，副行给「距下次还有 N 天」
 *   countup     从过去某天起累计、不循环。主数字 = 已经 N 天
 *
 * 不加 data-pjax：脚本常驻，靠 pjax:complete 重新渲染
 */
;(() => {
  'use strict'

  const DAY = 86400000

  // 只取年月日，避开时分秒和时区导致的差一天
  const toDate = (str) => {
    const [y, m, d] = String(str).split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const diffDays = (from, to) => Math.round((to - from) / DAY)

  const today = () => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }

  // 下一个周年日（含今天）
  const nextAnniversary = (start, base) => {
    let next = new Date(base.getFullYear(), start.getMonth(), start.getDate())
    if (next < base) {
      next = new Date(base.getFullYear() + 1, start.getMonth(), start.getDate())
    }
    return next
  }

  function render () {
    const cards = document.querySelectorAll('.days-card')
    if (!cards.length) return

    const now = today()

    cards.forEach((card) => {
      const dateStr = card.dataset.date
      if (!dateStr) return

      const target = toDate(dateStr)
      if (isNaN(target.getTime())) return

      const numEl = card.querySelector('.days-num')
      const subEl = card.querySelector('.days-sub')
      const nextEl = card.querySelector('.days-next')
      if (!numEl || !subEl) return

      const type = card.dataset.type || 'countdown'
      card.classList.add('is-' + type)

      if (type === 'anniversary') {
        const passed = diffDays(target, now)
        const toNext = diffDays(now, nextAnniversary(target, now))

        numEl.textContent = passed
        subEl.textContent = '已走过'
        if (nextEl) {
          nextEl.textContent = toNext === 0 ? '就是今天' : `距下次还有 ${toNext} 天`
        }
        if (toNext === 0) card.classList.add('is-today')
        return
      }

      if (type === 'countup') {
        const passed = diffDays(target, now)
        numEl.textContent = Math.abs(passed)
        subEl.textContent = passed >= 0 ? '已经' : '还有'
        if (nextEl) nextEl.textContent = ''
        return
      }

      // countdown
      const left = diffDays(now, target)
      if (left > 0) {
        numEl.textContent = left
        subEl.textContent = '还有'
      } else if (left === 0) {
        numEl.textContent = 0
        subEl.textContent = '就是今天'
        card.classList.add('is-today')
      } else {
        numEl.textContent = Math.abs(left)
        subEl.textContent = '已过去'
      }
      if (nextEl) nextEl.textContent = ''
    })
  }

  document.addEventListener('DOMContentLoaded', render)
  document.addEventListener('pjax:complete', render)
})()
