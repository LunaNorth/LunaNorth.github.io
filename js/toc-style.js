(() => {
  // 目录右上角的数字：显示目录条目总数（Stalux 的写法）。
  // 主题原本用这个位置显示「阅读进度百分比」，已经在
  // _config.butterfly.yml 里把 toc.scroll_percent 关掉了，
  // 所以这里可以放心写自己的内容。
  const renderCount = () => {
    const card = document.getElementById('card-toc')
    if (!card) return

    const counter = card.querySelector('.toc-percentage')
    const content = card.querySelector('.toc-content')
    if (!counter || !content) return

    const items = content.querySelectorAll('.toc-item')
    counter.textContent = items.length
  }

  renderCount()

  // PJAX 翻页后重新统计
  document.addEventListener('pjax:complete', renderCount)

  // 加密文章解锁后会重建目录，条目数会变，跟着更新
  const card = document.getElementById('card-toc')
  const content = card && card.querySelector('.toc-content')
  if (content) {
    new MutationObserver(renderCount).observe(content, { childList: true, subtree: true })
  }
})()
