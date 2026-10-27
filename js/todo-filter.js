/**
 * 清单页分类筛选
 *
 * 数据来自 source/_data/project.yml，模板在 includes/page/project.pug。
 * 每个分组渲染成 .list_item[data-type=week|month|year|other]，
 * 点顶部卡片里的按钮就按 data-type 显示/隐藏。
 *
 * 不加 data-pjax：脚本常驻，靠 pjax:complete 重新初始化即可
 * （pjax 切走再切回来时 DOM 是新的，需要重新绑定）。
 */
;(() => {
  'use strict'

  function init () {
    const card = document.getElementById('todo-filter')
    const list = document.getElementById('todolist')
    if (!card || !list) return

    const tabs = card.querySelectorAll('.todo-tab')
    const items = list.querySelectorAll('.list_item')
    const statEl = document.getElementById('todo-stat-visible')
    if (!tabs.length || !items.length) return

    const applyFilter = (type) => {
      let visible = 0
      items.forEach((el) => {
        const show = type === 'all' || el.dataset.type === type
        el.style.display = show ? '' : 'none'
        if (show) visible += 1
      })

      if (statEl) statEl.textContent = `共 ${visible} 项`

      // 该分类下没有分组时给一句提示，别让页面看起来像加载失败
      let empty = list.querySelector('.todo-empty')
      if (visible === 0) {
        if (!empty) {
          empty = document.createElement('p')
          empty.className = 'todo-empty'
          list.appendChild(empty)
        }
        empty.textContent = '这个分类下还没有计划，去 source/_data/project.yml 里加一条吧 ~'
      } else if (empty) {
        empty.remove()
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'))
        tab.classList.add('is-active')
        applyFilter(tab.dataset.filter)
      })
    })

    // pjax 切回本页时恢复到「全部」，避免残留上一次的筛选状态
    const active = card.querySelector('.todo-tab.is-active')
    applyFilter(active ? active.dataset.filter : 'all')
  }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('pjax:complete', init)
})()
