/* ============================================================
   碎碎念滚动播报条初始化（首页 + 归档页）
   ------------------------------------------------------------
   - Swiper 4.1.6 是站内本地文件：/js/swiper.min.js、/css/swiper.min.css
   - 首页由 hexo-butterfly-swiper 插件自动加载，但**归档页不会加载**，
     所以这里做按需加载：没就绪就自己插 <link>/<script>，加载完再初始化
   - 脚本不加 data-pjax：常驻，pjax 换页后靠 pjax:complete 重建实例
   - 只有一条碎碎念时不开 loop（Swiper 4 单 slide 会报错）
   ============================================================ */
(function () {
  var DELAY = 3500
  var instance = null
  var swiperLoading = null

  function destroy () {
    if (!instance) return
    try {
      instance.destroy(true, true)
    } catch (e) {}
    instance = null
  }

  // 按需加载 swiper（css + js），返回 Promise
  function ensureSwiper () {
    if (typeof Swiper !== 'undefined') return Promise.resolve()
    if (swiperLoading) return swiperLoading

    // 页面里已经有 swiper 的 <script>（插件用 defer 注入，可能还没执行到）→ 等它就绪，
    // 别再插一份，否则会重复加载 118KB 并覆盖全局 Swiper
    var existing = document.querySelector('script[src*="swiper.min.js"]')
    if (existing) {
      swiperLoading = new Promise(function (resolve, reject) {
        var n = 0
        ;(function poll () {
          if (typeof Swiper !== 'undefined') return resolve()
          if (n++ > 50) {
            swiperLoading = null
            return reject(new Error('swiper timeout'))
          }
          setTimeout(poll, 100)
        })()
      })
      return swiperLoading
    }

    if (!document.querySelector('link[href*="swiper.min.css"]')) {
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/css/swiper.min.css'
      document.head.appendChild(link)
    }

    swiperLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = '/js/swiper.min.js'
      script.onload = function () { resolve() }
      script.onerror = function () {
        swiperLoading = null
        reject(new Error('swiper load failed'))
      }
      document.head.appendChild(script)
    })
    return swiperLoading
  }

  function build () {
    var el = document.querySelector('.essay_bar_swiper_container')
    if (!el) return

    destroy()

    var slideCount = el.querySelectorAll('.swiper-slide').length
    if (slideCount < 2) return

    instance = new Swiper(el, {
      direction: 'vertical',
      loop: true,
      slidesPerView: 1,
      speed: 600,
      allowTouchMove: false,
      observer: true,
      observeParents: true,
      autoplay: {
        delay: DELAY,
        disableOnInteraction: false
      }
    })
  }

  function initEssayBar () {
    if (!document.querySelector('.essay_bar_swiper_container')) return
    ensureSwiper().then(build).catch(function () {})
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEssayBar)
  } else {
    initEssayBar()
  }

  document.addEventListener('pjax:complete', initEssayBar)
  window.addEventListener('load', initEssayBar)
})()
