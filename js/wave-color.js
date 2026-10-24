/**
 * 文章页暗色波浪上色(v3)
 * 颜色来自构建时预计算的 window.WAVE_COLOR_DATA(路径 → [r,g,b]),
 * 由 scripts/wave-color.js 在 hexo generate/server 时用 sharp 取封面底部平均色生成。
 * 查不到映射(无封面/取色失败的文章)回退 CSS 固定深色波浪;亮色模式恢复白色波浪。
 */
;(function () {
    var ALPHAS = [0.22, 0.32, 0.4, 0.5]

    function apply() {
        var list = document.querySelectorAll('.main-hero-waves-area .parallax > use')
        if (!list.length) return

        if (document.documentElement.getAttribute('data-theme') !== 'dark') {
            // 亮色:清掉内联色,恢复 CSS 白色波浪
            list.forEach(function (u) { u.style.fill = '' })
            return
        }

        var map = window.WAVE_COLOR_DATA || {}
        var rgb = map[location.pathname]
        if (rgb) {
            list.forEach(function (u, i) {
                u.style.fill = 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + ALPHAS[i] + ')'
            })
        } else {
            // 无预计算数据:回退 CSS 固定深色波浪
            list.forEach(function (u) { u.style.fill = '' })
        }
    }

    apply()
    document.addEventListener('pjax:complete', function () {
        setTimeout(apply, 200)
    })
    // 主题切换:亮色恢复白波浪,暗色按映射表上色
    if (window.MutationObserver) {
        new MutationObserver(apply).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        })
    }
})()
