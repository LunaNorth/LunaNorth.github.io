/**
 * 滑动阻尼效果 (Scroll Damping)
 *
 * 原理：
 *   1. 将页面内容放入 #damping-viewbox > #damping-scrollbox 容器
 *   2. 锁定 body 高度 = 内容总高度（创建原生滚动条）
 *   3. 监听 window scroll 事件，动态设置 #damping-scrollbox 的 top 偏移
 *   4. 利用 CSS transition 实现缓冲跟随的阻尼感
 *   5. 移动端（< 768px）自动回退为原生滚动 + scroll-behavior: smooth
 *
 * 为什么用 top 而不是 transform：
 *   transform 会创建新的 containing block，导致子元素的 position: fixed
 *   和 position: sticky 失效（如导航栏固定和侧边栏吸附）。使用 top 偏移
 *   可以保持这些定位行为正常工作。
 */
;(function () {
  'use strict'

  var MOBILE_BREAKPOINT = 768
  var isActive = false
  var scrollbox = null
  var viewbox = null

  /**
   * 检测是否为移动端
   */
  function isMobile () {
    return document.body.clientWidth < MOBILE_BREAKPOINT
  }

  /**
   * 同步 body 高度 = 内容实际高度，以创建原生滚动条
   */
  function syncBodyHeight () {
    if (!scrollbox || isMobile()) return
    var height = scrollbox.scrollHeight
    document.body.style.height = height + 'px'
    document.documentElement.style.height = height + 'px'
  }

  /**
   * 滚动处理：将 scrollbox 的 top 偏移同步到 window.scrollY
   */
  function handleScroll () {
    if (!isActive || !scrollbox) return
    scrollbox.style.top = -window.scrollY + 'px'
  }

  /**
   * 启用阻尼效果
   */
  function enable () {
    if (isActive) return
    isActive = true

    scrollbox = document.getElementById('damping-scrollbox')
    viewbox = document.getElementById('damping-viewbox')

    if (!scrollbox || !viewbox) return

    // 确保 body/html 没有任何 overflow 限制
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''

    syncBodyHeight()
    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  /**
   * 禁用阻尼效果（移动端回退）
   */
  function disable () {
    if (!isActive) return
    isActive = false

    window.removeEventListener('scroll', handleScroll)

    // 恢复 body 默认样式
    document.body.style.height = ''
    document.body.style.overflow = ''
    document.documentElement.style.height = ''
    document.documentElement.style.overflow = ''

    if (scrollbox) {
      scrollbox.style.top = ''
    }
  }

  /**
   * 根据屏幕宽度切换阻尼开关
   */
  function toggle () {
    if (isMobile()) {
      disable()
    } else {
      enable()
    }
  }

  // ========== 初始化 ==========
  function init () {
    // 初始切换
    toggle()

    // 窗口大小变化时重新判断
    var resizeTimer = null
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        toggle()
      }, 150)
    })

    // 内容加载完成后重新计算高度（图片懒加载等）
    window.addEventListener('load', function () {
      if (isActive) {
        syncBodyHeight()
      }
    })

    // PJAX 页面切换后重新计算
    document.addEventListener('pjax:complete', function () {
      // 等待新内容渲染完成
      setTimeout(function () {
        if (isActive) {
          scrollbox = document.getElementById('damping-scrollbox')
          viewbox = document.getElementById('damping-viewbox')
          syncBodyHeight()
          // 重置滚动位置
          window.scrollTo(0, 0)
        }
      }, 100)
    })

    document.addEventListener('pjax:success', function () {
      setTimeout(function () {
        if (isActive) {
          scrollbox = document.getElementById('damping-scrollbox')
          viewbox = document.getElementById('damping-viewbox')
          syncBodyHeight()
          window.scrollTo(0, 0)
        }
      }, 100)
    })

    // 监听内容区域变化（兜底方案）
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (isActive) {
          syncBodyHeight()
        }
      })

      var contentTarget = document.getElementById('content-inner')
      if (contentTarget) {
        observer.observe(contentTarget, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'src', 'data-lazy-src']
        })
      }
    }
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
