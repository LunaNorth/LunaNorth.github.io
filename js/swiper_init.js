// 本地化版轮播初始化:等 Swiper 库就位 + 容器重试 + 防重复初始化
// (原版直接 new Swiper,库加载失败/容器未挂载时会白屏,只能反复刷新)
;(function () {
    var retry = 0
    function init() {
        if (typeof Swiper === 'undefined') {
            // 前 20 次每 200ms 快速重试,之后转 1s 慢速持续重试(库晚到也能补上)
            retry++
            return setTimeout(init, retry <= 20 ? 200 : 1000)
        }
        var el = document.querySelector('.blog-slider')
        if (!el) {
            retry++
            return setTimeout(init, retry <= 20 ? 200 : 1000) // pjax 注入容器可能晚于本脚本
        }
        if (el.dataset.swiperReady === '1') return
        var swiper = new Swiper('.blog-slider', {
            passiveListeners: true,
            spaceBetween: 30,
            effect: 'fade',
            loop: true,
            autoplay: {
                disableOnInteraction: true,
                delay: 3000
            },
            mousewheel: true,
            pagination: {
                el: '.blog-slider__pagination',
                clickable: true
            }
        })
        el.dataset.swiperReady = '1'
        var comtainer = document.getElementById('swiper_container')
        if (comtainer !== null) {
            comtainer.onmouseenter = function () {
                swiper.autoplay.stop()
            }
            comtainer.onmouseleave = function () {
                swiper.autoplay.start()
            }
        }
    }
    init()
    document.addEventListener('pjax:complete', function () {
        retry = 0
        setTimeout(init, 300)
    })
})()
