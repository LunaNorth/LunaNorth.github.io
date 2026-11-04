/**
 * 链接预取（hover / touch 时预热下一页）
 *
 * 配合 pjax：鼠标移到站内链接上就把目标页拉进 HTTP 缓存，
 * 真正点击时 pjax 的 fetch 直接命中缓存，切页几乎瞬时。
 * 不预取外链、锚点、当前页、带 target 的链接，并发上限 4，重复链接只取一次。
 */

'use strict'

;(function () {
  if (!('requestIdleCallback' in window) && document.visibilityState === 'hidden') return

  const MAX_CONCURRENT = 4
  const SKIP_EXT = /\.(jpe?g|png|gif|webp|avif|svg|ico|css|js|json|xml|txt|zip|rar|7z|pdf|mp4|mp3|woff2?|ttf|otf)$/i

  const seen = new Set()
  let inflight = 0

  const normalize = href => {
    try {
      const url = new URL(href, location.href)
      url.hash = ''
      return url
    } catch (err) {
      return null
    }
  }

  const prefetch = url => {
    if (!url || seen.has(url.href) || inflight >= MAX_CONCURRENT) return
    if (url.origin !== location.origin) return
    if (SKIP_EXT.test(url.pathname)) return
    if (url.pathname === location.pathname) return

    seen.add(url.href)
    inflight++

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'document'
    link.href = url.href
    // 预取失败（404、断网）不需要提示，静默清理即可
    link.addEventListener('error', () => {
      seen.delete(url.href)
      inflight--
      link.remove()
    })
    link.addEventListener('load', () => {
      inflight--
    })
    document.head.appendChild(link)
  }

  const handle = event => {
    const anchor = event.target.closest && event.target.closest('a[href]')
    if (!anchor) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download') || anchor.dataset.noPrefetch !== undefined) return

    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

    prefetch(normalize(href))
  }

  // 桌面端：悬停 60ms 以上才算有意向，避免鼠标扫过时乱发请求
  let hoverTimer = null
  document.addEventListener('mouseover', event => {
    clearTimeout(hoverTimer)
    hoverTimer = setTimeout(() => handle(event), 60)
  }, { passive: true })

  document.addEventListener('mouseout', () => clearTimeout(hoverTimer), { passive: true })

  // 移动端：手指按下就预热（点击到跳转之间有几百毫秒空档）
  document.addEventListener('touchstart', handle, { passive: true })
})()
