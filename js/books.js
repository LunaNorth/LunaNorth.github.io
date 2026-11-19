/**
 * 书屿页（/books/）
 *
 * 页面本身是纯静态的：分组、排序、星级、进度都在构建期算好，前端不发请求。
 * 这里只补一件 CSS 做不到的事：
 *   桌面靠 :hover 展开摘句层，触屏没有 hover，改成点一下展开、再点一下收起；
 *   桌面点有外链的卡片，等价于打开那本书的外链。
 *
 * 不加 data-pjax：脚本常驻，靠 pjax:complete 重新绑定
 */
;(() => {
  'use strict'

  const ROOT = '.books-page'

  function bind () {
    const page = document.querySelector(ROOT)
    if (!page || page.dataset.bound) return
    page.dataset.bound = '1'

    const touch = window.matchMedia && window.matchMedia('(hover: none)').matches

    page.addEventListener('click', (e) => {
      const card = e.target.closest('.bk-card')
      if (!card) return

      if (touch) {
        // 再点一下收起；点别的卡片时先把上一张收掉
        const open = card.classList.contains('is-open')
        page.querySelectorAll('.bk-card.is-open').forEach((c) => c.classList.remove('is-open'))
        if (!open) card.classList.add('is-open')
        return
      }

      // 外链挂在卡片的 data-href 上（模板里只有填了 link 才有这个属性）
      const href = card.dataset.href
      if (href) window.open(href, '_blank', 'noopener')
    })
  }

  function init () {
    bind()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  document.addEventListener('pjax:complete', init)
})()
