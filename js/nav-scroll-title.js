/**
 * 导航栏滚动切换：向下滚动时菜单淡出、当前页面标题浮上来，向上滚动恢复菜单
 *
 * 只负责根据滚动方向给 #nav 加/移除 .nav-show-title，
 * 显示、隐藏、过渡动画全部交给 CSS（custom.css「导航栏：滚动显示页面标题」段）。
 *
 * 为什么不加 data-pjax：
 *   pjax 切换页面时 #nav 不会被重建，脚本只需重新计算标题文字并重置状态，
 *   自己监听 pjax:complete 即可，加 data-pjax 反而会重复加载脚本、重复绑定监听。
 */
;(() => {
  'use strict'

  const NAV_STATE_CLASS = 'nav-show-title'
  const SCROLL_THRESHOLD = 50 // 顶部 50px 内不切换，避免轻微滚动就闪标题

  let lastScrollTop = 0
  let ticking = false
  let scrollHandler = null

  function updateNav () {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const nav = document.getElementById('nav')
    if (!nav) {
      ticking = false
      return
    }

    if (scrollTop > lastScrollTop && scrollTop > SCROLL_THRESHOLD) {
      nav.classList.add(NAV_STATE_CLASS) // 向下：显示标题
    } else {
      nav.classList.remove(NAV_STATE_CLASS) // 向上：恢复菜单
    }

    lastScrollTop = scrollTop
    ticking = false
  }

  function onScroll () {
    if (!ticking) {
      window.requestAnimationFrame(updateNav)
      ticking = true
    }
  }

  function setPageName () {
    const pageName = document.getElementById('page-name')
    if (!pageName) return
    // 本站 <title> 形如「页面标题 | 春熙景明」，取分隔符前的一段
    const name = (document.title.split(' | ')[0] || document.title).trim()
    if (name) pageName.textContent = name
  }

  function init () {
    setPageName()

    // 清理旧监听器，避免 pjax 反复切换后越绑越多
    if (scrollHandler) window.removeEventListener('scroll', scrollHandler)

    lastScrollTop = window.scrollY || document.documentElement.scrollTop
    const nav = document.getElementById('nav')
    if (nav) nav.classList.remove(NAV_STATE_CLASS)

    scrollHandler = onScroll
    window.addEventListener('scroll', scrollHandler, { passive: true })
  }

  // 供 pug 里的 href="javascript:scrollToTop()" 调用
  window.scrollToTop = () => {
    const nav = document.getElementById('nav')
    if (nav) nav.classList.remove(NAV_STATE_CLASS)
    if (typeof btf !== 'undefined' && typeof btf.scrollToDest === 'function') {
      btf.scrollToDest(0, 500)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('pjax:complete', init)
})()
