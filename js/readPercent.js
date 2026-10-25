/**
 * 右下角返回顶部按钮的阅读进度百分比
 * ------------------------------------------------------------
 * 性能重写(2026-10-25):原版 window.onscroll = percent 让每个 scroll 事件
 * (每秒可达上百次)都执行一次「布局读取 + innerHTML 重写」,即使百分比没变也写 DOM ——
 * 典型的滚动布局抖动,亮暗两种模式滚动都受影响。
 * 现在改为:
 *   1) rAF 合帧:连续滚动每帧最多计算一次;
 *   2) 值变化才写 DOM:百分比没变直接返回;
 *   3) innerHTML 改 textContent(避免解析 HTML 字符串);
 *   4) pjax 换页后右侧按钮会重建,缓存的元素失效时自动重新查询。
 */
(function () {
    var upEl = null;
    var lastResult = -1;
    var ticking = false;

    function percent() {
        var doc = document.documentElement;
        var a = doc.scrollTop || window.pageYOffset; // 卷去高度
        var b = Math.max(
            document.body.scrollHeight, doc.scrollHeight,
            document.body.offsetHeight, doc.offsetHeight,
            document.body.clientHeight, doc.clientHeight
        ) - doc.clientHeight; // 整个网页可滚高度
        var result = b > 0 ? Math.round((a / b) * 100) : 0; // 计算百分比
        if (result === lastResult) return; // 百分比没变,不碰 DOM
        lastResult = result;

        if (!upEl || !upEl.isConnected) upEl = document.getElementById("go-up");
        if (!upEl) return;

        if (result <= 95) {
            upEl.childNodes[0].style.display = 'none';
            upEl.childNodes[1].style.display = 'block';
            upEl.childNodes[1].textContent = result;
        } else {
            upEl.childNodes[1].style.display = 'none';
            upEl.childNodes[0].style.display = 'block';
        }
    }

    window.onscroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            percent();
            ticking = false;
        });
    };
})()
