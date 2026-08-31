function dark() {window.requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame;var n,e,i,h,t=.05,s=document.getElementById("universe"),o=!0,a="180,184,240",r="226,225,142",d="226,225,224",c=[];function f(){n=window.innerWidth,e=window.innerHeight,i=.216*n,s.setAttribute("width",n),s.setAttribute("height",e)}function u(){h.clearRect(0,0,n,e);for(var t=c.length,i=0;i<t;i++){var s=c[i];s.move(),s.fadeIn(),s.fadeOut(),s.draw()}}function y(){this.reset=function(){this.giant=m(3),this.comet=!this.giant&&!o&&m(10),this.x=l(0,n-10),this.y=l(0,e),this.r=l(1.1,2.6),this.dx=l(t,6*t)+(this.comet+1-1)*t*l(50,120)+2*t,this.dy=-l(t,6*t)-(this.comet+1-1)*t*l(50,120),this.fadingOut=null,this.fadingIn=!0,this.opacity=0,this.opacityTresh=l(.2,1-.4*(this.comet+1-1)),this.do=l(5e-4,.002)+.001*(this.comet+1-1)},this.fadeIn=function(){this.fadingIn&&(this.fadingIn=!(this.opacity>this.opacityTresh),this.opacity+=this.do)},this.fadeOut=function(){this.fadingOut&&(this.fadingOut=!(this.opacity<0),this.opacity-=this.do/2,(this.x>n||this.y<0)&&(this.fadingOut=!1,this.reset()))},this.draw=function(){if(h.beginPath(),this.giant)h.fillStyle="rgba("+a+","+this.opacity+")",h.arc(this.x,this.y,2,0,2*Math.PI,!1);else if(this.comet){h.fillStyle="rgba("+d+","+this.opacity+")",h.arc(this.x,this.y,1.5,0,2*Math.PI,!1);for(var t=0;t<30;t++)h.fillStyle="rgba("+d+","+(this.opacity-this.opacity/20*t)+")",h.rect(this.x-this.dx/4*t,this.y-this.dy/4*t-2,2,2),h.fill()}else h.fillStyle="rgba("+r+","+this.opacity+")",h.rect(this.x,this.y,this.r,this.r);h.closePath(),h.fill()},this.move=function(){this.x+=this.dx,this.y+=this.dy,!1===this.fadingOut&&this.reset(),(this.x>n-n/4||this.y<0)&&(this.fadingOut=!0)},setTimeout(function(){o=!1},50)}function m(t){return Math.floor(1e3*Math.random())+1<10*t}function l(t,i){return Math.random()*(i-t)+t}f(),window.addEventListener("resize",f,!1),function(){h=s.getContext("2d");for(var t=0;t<i;t++)c[t]=new y,c[t].reset();u()}(),function t(){document.getElementsByTagName('html')[0].getAttribute('data-theme')=='dark'&&u(),window.requestAnimationFrame(t)}()};
dark()

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
function essayScroll() {
    let a = document.documentElement.scrollTop || window.pageYOffset; // 当前滚动位置
    const waterfallResult = a % document.documentElement.clientHeight; // 滚动的视口高度余数

    if (
        !percentFlag &&
        waterfallResult + 100 >= document.documentElement.clientHeight &&
        document.querySelector("#waterfall")
    ) {
        setTimeout(() => {
            waterfall("#waterfall");
        }, 500);
    } else {
        setTimeout(() => {
            document.querySelector("#waterfall") && waterfall("#waterfall");
        }, 500);
    }

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
    initIndexEssay: function () {
        setTimeout(() => {
            let essay_bar_swiper = new Swiper(".essay_bar_swiper_container", {
                passiveListeners: true,
                direction: "vertical",
                loop: true,
                autoplay: {
                    disableOnInteraction: true,
                    delay: 3000,
                },
                mousewheel: true,
            });

            let essay_bar_comtainer = document.getElementById("bbtalk");
            if (essay_bar_comtainer !== null) {
                essay_bar_comtainer.onmouseenter = function () {
                    essay_bar_swiper.autoplay.stop();
                };
                essay_bar_comtainer.onmouseleave = function () {
                    essay_bar_swiper.autoplay.start();
                };
            }
        }, 100);
    },
};

june.initIndexEssay();
june.changeTimeInEssay();
june.reflashEssayWaterFall();

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
