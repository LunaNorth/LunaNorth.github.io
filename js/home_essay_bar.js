/* 首页轻语速览条 — Swiper 初始化
   沿用 swiper_init.js 的容错思路：
   库晚到 / 容器未挂载 / pjax 重渲染，都不会白屏，能自动补上。
   依赖主题已本地化的 /js/swiper.min.js */
;(function () {
    var retry = 0

    function init() {
        if (typeof Swiper === 'undefined') {
            // 前 20 次每 200ms 快速重试，之后转 1s 慢速持续重试
            retry++
            return setTimeout(init, retry <= 20 ? 200 : 1000)
        }

        var el = document.getElementById('bbtalk')
        if (!el) {
            // 非首页或容器未渲染，退出即可
            return
        }
        if (el.dataset.swiperReady === '1') return

        var slides = el.querySelectorAll('.li-style').length
        if (!slides) return

        new Swiper('#bbtalk', {
            direction: 'vertical',
            // 不足 2 条时不循环，否则 Swiper 会出现空白
            loop: slides > 1,
            speed: 600,
            spaceBetween: 0,
            allowTouchMove: true,
            mousewheel: {
                forceToAxis: true
            },
            autoplay: slides > 1 ? {
                delay: 4000,
                disableOnInteraction: false
            } : false,
            on: {
                // 鼠标悬停时暂停，离开后继续
                init: function () {
                    var self = this
                    var box = document.getElementById('bbTimeList')
                    if (!box) return
                    box.addEventListener('mouseenter', function () {
                        self.autoplay && self.autoplay.stop()
                    })
                    box.addEventListener('mouseleave', function () {
                        self.autoplay && self.autoplay.start()
                    })
                }
            }
        })

        el.dataset.swiperReady = '1'
    }

    init()

    document.addEventListener('pjax:complete', function () {
        retry = 0
        setTimeout(init, 300)
    })
})()

