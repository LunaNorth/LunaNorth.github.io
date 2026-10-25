// 星空背景已移除(原 dark() 函数),保留文件其余功能:碎碎念瀑布流/分页/日期显示

//动态标题
var OriginTitile = document.title;
var titleTime;
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    //离开当前页面时标签显示内容
    document.title = "w(ﾟДﾟ)w 不要走！再看看嘛！";
    clearTimeout(titleTime);
  } else {
    //返回当前页面时标签显示内容
    document.title = "♪(^∇^*)欢迎肥来！" + OriginTitile;
    //两秒后变回正常标题
    titleTime = setTimeout(function () {
      document.title = OriginTitile;
    }, 2000);
  }
});


var percentFlag = false; // 节流阀
var essayWaterfallTimer = null; // 瀑布流重排防抖计时器
function essayScroll() {
    // 瀑布流重排:滚动停止 500ms 后最多执行一次。
    // 原版每个 scroll 事件都排一次 waterfall(),碎碎念/留言页上滚动会连环触发
    // 重量级重排(读取所有条目位置再逐个写回)造成明显卡顿。
    clearTimeout(essayWaterfallTimer);
    essayWaterfallTimer = setTimeout(() => {
        document.querySelector("#waterfall") && waterfall("#waterfall");
    }, 500);

    const r = window.scrollY + document.documentElement.clientHeight;
    let p = document.getElementById("post-comment") || document.getElementById("footer");

    (p.offsetTop + p.offsetHeight / 2 < r) && (percentFlag = true);
}
function replaceAll(e, n, t) {
    return e.split(n).join(t);
}
var june = {
    diffDate: function (d, more = false) {
        const dateNow = new Date();
        const datePost = new Date(d);
        if (isNaN(datePost.getTime())) { // 检查日期是否有效
            console.error("Invalid date:", d);
            return "Invalid Date";
        }
    
        const dateDiff = dateNow.getTime() - datePost.getTime();
        const minute = 1000 * 60;
        const hour = minute * 60;
        const day = hour * 24;
        const month = day * 30;
    
        let result;
        if (more) {
            const monthCount = dateDiff / month;
            const dayCount = dateDiff / day;
            const hourCount = dateDiff / hour;
            const minuteCount = dateDiff / minute;
    
            if (monthCount >= 1) {
                result = datePost.toLocaleDateString().replace(/\//g, "-");
            } else if (dayCount >= 1) {
                result = parseInt(dayCount) + " " + (GLOBAL_CONFIG?.date_suffix?.day || "days");
            } else if (hourCount >= 1) {
                result = parseInt(hourCount) + " " + (GLOBAL_CONFIG?.date_suffix?.hour || "hours");
            } else if (minuteCount >= 1) {
                result = parseInt(minuteCount) + " " + (GLOBAL_CONFIG?.date_suffix?.min || "minutes");
            } else {
                result = (GLOBAL_CONFIG?.date_suffix?.just || "Just now");
            }
        } else {
            result = parseInt(dateDiff / day);
        }
        return result;
      },
    changeTimeInEssay: function () {
        document.querySelector("#bber") &&
        document.querySelectorAll("#bber time").forEach(function (e) {
            var t = e,
                datetime = t.getAttribute("datetime");
            // 直接显示原始日期(如 2026-08-20),不做相对时间换算
            (t.innerText = datetime || t.innerText), (t.style.display = "inline");
        });
    },
    reflashEssayWaterFall: function () {
        document.querySelector("#waterfall") &&
        setTimeout(function () {
            waterfall("#waterfall");
            document.getElementById("waterfall").classList.add("show");
        }, 500);
    },
    commentText: function (txt) {
        const postCommentDom = document.querySelector("#post-comment");
        var domTop = postCommentDom.offsetTop;
        window.scrollTo(0, domTop - 80);
        if (txt == "undefined" || txt == "null") txt = "好棒！";
        function setText() {
            setTimeout(() => {
                var input = document.getElementsByClassName("el-textarea__inner")[0];
                if (!input) setText();
                let evt = document.createEvent("HTMLEvents");
                evt.initEvent("input", true, true);
                let inputValue = replaceAll(txt, "\n", "\n> ");
                input.value = "> " + inputValue + "\n\n";
                input.dispatchEvent(evt);
                input.focus();
                input.setSelectionRange(-1, -1);
                if (document.getElementById("comment-tips")) {
                    document.getElementById("comment-tips").classList.add("show");
                }
            }, 100);
        }
        setText();
    },
    // initIndexEssay(播报条轮播初始化)已删除:
    // 它无条件 new Swiper(...),但 Swiper 库只有首页(插件)和归档页(essaybar.js 按需加载)才有,
    // 其它页面必报 "Swiper is not defined";而且 essaybar.js 已有带按需加载/防重复/销毁重建的
    // 完整实现,这里再初始化一遍属于重复管理同一容器。悬停暂停逻辑已迁移到 essaybar.js。
};

june.changeTimeInEssay();
june.reflashEssayWaterFall();

// ===== 滚动时暂停页内所有轮播动画(2026-10-25 滚动性能优化) =====
// 轮播的淡入淡出每帧都触发合成,和滚动抢渲染预算(实测滚动帧率 -10% 左右)。
// 做法:滚动开始 → 暂停所有轮播的 autoplay;滚动停止 250ms 后,只恢复暂停前本来
// 在跑的那些(不干扰「悬停暂停」等已有交互)。
// 枚举:站内只有两个轮播容器(首页推荐卡 .blog-slider、播报条 .essay_bar_swiper_container);
// 本站 Swiper 4.1.6 初始化不加 -initialized 类,但会把实例挂到 el.swiper 上,靠它判重。
// universe.js 带 data-pjax 会在 pjax 后重复执行,全局标记保证监听只绑一次。
if (!window.__swiperScrollPauseBound) {
    window.__swiperScrollPauseBound = true;
    var swiperScrollTimer = null;
    var SWIPER_CONTAINERS = ".blog-slider, .essay_bar_swiper_container";
    window.addEventListener("scroll", function () {
        if (swiperScrollTimer) return; // 已处于暂停态,不用重复停
        var running = [];
        document.querySelectorAll(SWIPER_CONTAINERS).forEach(function (el) {
            if (el.swiper && el.swiper.autoplay && el.swiper.autoplay.running) {
                el.swiper.autoplay.stop();
                running.push(el.swiper);
            }
        });
        swiperScrollTimer = setTimeout(function () {
            swiperScrollTimer = null;
            running.forEach(function (s) { s.autoplay.start() });
        }, 250);
    }, { passive: true });
}

// ===== bber 短文分页(客户端分页:全部条目渲染进 DOM,JS 按页显隐) =====
function bberPagination() {
    var waterfallEl = document.getElementById("waterfall");
    var paginationEl = document.getElementById("bber-pagination");
    var tipsEl = document.getElementById("bber-tips");
    if (!waterfallEl || !paginationEl) return;
    var items = Array.prototype.slice.call(waterfallEl.querySelectorAll("li.bber-item"));
    var total = items.length;
    var pageSize = parseInt(waterfallEl.getAttribute("data-page-size"), 10) || 9;
    if (pageSize < 1) pageSize = 9;
    var pageCount = Math.max(1, Math.ceil(total / pageSize));
    var current = 1;

    // 全部显示模式(每页条数 >= 总条数,即 page_size 未填或填的值不小于总数):不渲染分页器,只显示总条数
    if (pageSize >= total) {
        paginationEl.innerHTML = "";
        if (tipsEl) tipsEl.innerText = "- 共 " + total + " 条短文 -";
        items.forEach(function (el) { el.classList.remove("bber-hidden"); });
        return;
    }

    function renderNav() {
        var html = "";
        html += current > 1
            ? '<a class="extend prev" href="javascript:;" data-page="' + (current - 1) + '"><i class="fa-solid fa-chevron-left fa-fw"></i></a>'
            : '<span class="extend prev disabled"><i class="fa-solid fa-chevron-left fa-fw"></i></span>';
        for (var p = 1; p <= pageCount; p++) {
            if (pageCount <= 9 || p === 1 || p === pageCount || Math.abs(p - current) <= 2) {
                if (p === current) {
                    html += '<span class="page-number current">' + p + '</span>';
                } else {
                    html += '<a class="page-number" href="javascript:;" data-page="' + p + '">' + p + '</a>';
                }
            } else if (p === 2 || p === pageCount - 1) {
                html += '<span class="page-number">…</span>';
            }
        }
        html += current < pageCount
            ? '<a class="extend next" href="javascript:;" data-page="' + (current + 1) + '"><i class="fa-solid fa-chevron-right fa-fw"></i></a>'
            : '<span class="extend next disabled"><i class="fa-solid fa-chevron-right fa-fw"></i></span>';
        paginationEl.innerHTML = html;
    }

    function showPage(page, doScroll) {
        current = Math.min(Math.max(1, page), pageCount);
        items.forEach(function (el, i) {
            el.classList.toggle("bber-hidden", Math.floor(i / pageSize) + 1 !== current);
        });
        renderNav();
        if (tipsEl) {
            tipsEl.innerText = "- 第 " + current + " / " + pageCount + " 页 · 共 " + total + " 条短文 · 每页 " + pageSize + " 条 -";
        }
        if (doScroll) {
            var essayPage = document.getElementById("essay_page");
            if (essayPage) {
                window.scrollTo({ top: essayPage.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
            }
        }
    }

    paginationEl.addEventListener("click", function (e) {
        var t = e.target;
        while (t && t !== paginationEl && !t.getAttribute("data-page")) { t = t.parentNode; }
        if (!t || t === paginationEl) return;
        var p = parseInt(t.getAttribute("data-page"), 10);
        if (!isNaN(p) && p !== current) showPage(p, true);
    });

    showPage(1);
}
bberPagination();

window.addEventListener("scroll", essayScroll);


function waterfall(a) {
    // essay 页禁用瀑布流,改由 CSS 单列堆叠(max-width 居中,li 一行一条)
    if (location.pathname.indexOf('/essay') !== -1) return;
    function b(a, b) {
        var c = window.getComputedStyle(b);
        return parseFloat(c["margin" + a]) || 0;
    }
    function c(a) {
        return a + "px";
    }
    function d(a) {
        return parseFloat(a.style.top);
    }
    function e(a) {
        return parseFloat(a.style.left);
    }
    function f(a) {
        return a.clientWidth;
    }
    function g(a) {
        return a.clientHeight;
    }
    function h(a) {
        return d(a) + g(a) + b("Bottom", a);
    }
    function i(a) {
        return e(a) + f(a) + b("Right", a);
    }
    function j(a) {
        a = a.sort(function (a, b) {
            return h(a) === h(b) ? e(b) - e(a) : h(b) - h(a);
        });
    }
    function k(b) {
        f(a) != t && (b.target.removeEventListener(b.type, arguments.callee), waterfall(a));
    }
    "string" == typeof a && (a = document.querySelector(a));
    var l = [].map.call(a.children, function (a) {
        return (a.style.position = "absolute"), a;
    });
    a.style.position = "relative";
    var m = [];
    l.length && ((l[0].style.top = "0px"), (l[0].style.left = c(b("Left", l[0]))), m.push(l[0]));
    for (var n = 1; n < l.length; n++) {
        var o = l[n - 1],
            p = l[n],
            q = i(o) + f(p) <= f(a);
        if (!q) break;
        (p.style.top = o.style.top), (p.style.left = c(i(o) + b("Left", p))), m.push(p);
    }
    for (; n < l.length; n++) {
        j(m);
        var p = l[n],
            r = m.pop();
        (p.style.top = c(h(r) + b("Top", p))), (p.style.left = c(e(r))), m.push(p);
    }
    j(m);
    var s = m[0];
    a.style.height = c(h(s) + b("Bottom", s));
    var t = f(a);
    window.addEventListener ? window.addEventListener("resize", k) : (document.body.onresize = k);
}


// 清单
function waterfall(a) {
	// essay 页禁用瀑布流,改由 CSS 单列堆叠
	if (location.pathname.indexOf('/essay') !== -1) return;
	function b(a, b) {
		var c = window.getComputedStyle(b);
		return parseFloat(c["margin" + a]) || 0
	}

	function c(a) {
		return a + "px"
	}

	function d(a) {
		return parseFloat(a.style.top)
	}

	function e(a) {
		return parseFloat(a.style.left)
	}

	function f(a) {
		return a.clientWidth
	}

	function g(a) {
		return a.clientHeight
	}

	function h(a) {
		return d(a) + g(a) + b("Bottom", a)
	}

	function i(a) {
		return e(a) + f(a) + b("Right", a)
	}

	function j(a) {
		a = a.sort(function(a, b) {
			return h(a) === h(b) ? e(b) - e(a) : h(b) - h(a)
		})
	}

	function k(b) {
		f(a) != t && (b.target.removeEventListener(b.type, arguments.callee), waterfall(a))
	}
	"string" == typeof a && (a = document.querySelector(a));
	var l = [].map.call(a.children, function(a) {
		return a.style.position = "absolute", a
	});
	a.style.position = "relative";
	var m = [];
	l.length && (l[0].style.top = "0px", l[0].style.left = c(b("Left", l[0])), m.push(l[0]));
	for (var n = 1; n < l.length; n++) {
		var o = l[n - 1],
			p = l[n],
			q = i(o) + f(p) <= f(a);
		if (!q) break;
		p.style.top = o.style.top, p.style.left = c(i(o) + b("Left", p)), m.push(p)
	}
	for (; n < l.length; n++) {
		j(m);
		var p = l[n],
			r = m.pop();
		p.style.top = c(h(r) + b("Top", p)), p.style.left = c(e(r)), m.push(p)
	}
	j(m);
	var s = m[0];
	a.style.height = c(h(s) + b("Bottom", s));
	var t = f(a);
	window.addEventListener ? window.addEventListener("resize", k) : document.body.onresize = k
}

// 瀑布流处理


function whenDOMReady() {
	window.addEventListener('load', function() {
		if (location.pathname == '/project/') waterfall('#todolist');
	});
}
whenDOMReady()
document.addEventListener("pjax:complete", whenDOMReady)

// 清单函数适配pjax
