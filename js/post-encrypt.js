/* ==========================================================================
   加密文章：解锁后重建侧边栏目录

   背景：加密文章的标题不能写进 HTML —— 主题原来的 card_post_toc.pug 会用
        toc(page.origin) 把明文标题塞进 .toc-content，再用 display:none 藏起来，
        可查看源码就能拿到全部标题。现在生成时只留空容器，解锁后在这里重建。

   触发：hexo-blog-encrypt 4.x 解密成功后派发 hexo-blog-decrypt 事件
        （detail.mode = manual 手动输入 / cached 记住密码自动解锁）。

   点击：主题给 .toc-content 绑的委托会走 decodeURI + getElementById，
        和这里的原始 id（中文标题）对不上，所以自己处理并阻止冒泡。
   ========================================================================== */
(function () {
  'use strict'

  var HEADING = 'h2, h3'

  function buildToc () {
    var card = document.getElementById('card-toc')
    if (!card) return

    var box = card.querySelector('.toc-content')
    if (!box || box.dataset.tocBuilt === '1') return

    var container = document.getElementById('article-container')
    if (!container) return

    var headings = []
    var all = container.querySelectorAll(HEADING)
    for (var i = 0; i < all.length; i++) {
      if (all[i].id) headings.push(all[i])
    }
    if (!headings.length) return

    var root = document.createElement('ol')
    root.className = 'toc'
    var currentH2 = null

    headings.forEach(function (heading) {
      var isH2 = heading.tagName === 'H2'
      var li = document.createElement('li')
      li.className = 'toc-item toc-level-' + (isH2 ? '2' : '3')

      var link = document.createElement('a')
      link.className = 'toc-link'
      link.href = '#' + heading.id
      link.dataset.id = heading.id

      var text = document.createElement('span')
      text.className = 'toc-text'
      text.textContent = heading.textContent.replace(/\s+/g, ' ').trim()
      link.appendChild(text)
      li.appendChild(link)

      if (isH2) {
        root.appendChild(li)
        currentH2 = li
        return
      }

      // h3 挂到最近的 h2 下面；文章没有 h2 时直接放顶层，不至于整块消失
      if (!currentH2) {
        root.appendChild(li)
        return
      }
      var child = currentH2.querySelector('.toc-child')
      if (!child) {
        child = document.createElement('ol')
        child.className = 'toc-child'
        currentH2.appendChild(child)
      }
      child.appendChild(li)
    })

    box.replaceChildren(root)
    box.dataset.tocBuilt = '1'
    box.style.display = 'block'
  }

  function jumpTo (link) {
    var id = link.dataset.id
    var target = id && document.getElementById(id)
    if (!target) return

    var btf = window.btf
    var top = btf && btf.getEleTop
      ? btf.getEleTop(target)
      : target.getBoundingClientRect().top + window.pageYOffset

    if (btf && btf.scrollToDest) {
      btf.scrollToDest(top, 300)
    } else {
      window.scrollTo({ top: top, behavior: 'smooth' })
    }
    history.replaceState(null, '', '#' + id)
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('#card-toc .toc-content a.toc-link')
    if (!link || link.dataset.id === undefined) return
    e.preventDefault()
    e.stopPropagation()
    jumpTo(link)
  })

  window.addEventListener('hexo-blog-decrypt', buildToc)
})()
