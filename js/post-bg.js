/**
 * 右侧设置面板:文章背景切换按钮(仅暗色模式显示/可用)
 * ------------------------------------------------------------
 * 在右侧「设置」(齿轮)面板里、暗色切换按钮(#darkmode)后面插入一个按钮:
 *   - 默认(清晰):图标 fa-image,半透明卡片,背景图清晰透出(原版效果)
 *   - 毛玻璃:    图标 fa-smog + 主题蓝高亮,卡片背后的背景图被糊开(磨砂质感)
 * 点击切换并写入 localStorage['post-bg-style'];
 * 页面刷新时的初始恢复由 scripts/dark_post_bg.js 注入的头部脚本完成(无闪烁)。
 *
 * 亮色模式下按钮由注入的 CSS 隐藏(html:not([data-theme="dark"])),点开设置也看不到。
 * 样式不用单独写:按钮是 #rightside-config-hide 的直接子元素,
 * 自动继承主题 #rightside > div > button 的 35x35 圆角按钮外观。
 *
 * pjax:脚本带 data-pjax,每次 pjax 完成后重新执行;init 幂等(按 id 查重),不会重复建按钮。
 */
;(function () {
  const STORAGE_KEY = 'post-bg-style' // 与 scripts/dark_post_bg.js 注入的恢复脚本共用
  const BTN_ID = 'post-bg-toggle'
  const html = document.documentElement

  // 毛玻璃态 = html 上有 data-post-bg 属性(初始由头部脚本恢复,点击时同步增删)
  const isSolid = () => html.hasAttribute('data-post-bg')

  const render = (btn) => {
    const solid = isSolid()
    btn.innerHTML = '<i class="fas ' + (solid ? 'fa-smog' : 'fa-image') + '"></i>'
    btn.title = solid ? '文章背景:毛玻璃(点击切回清晰)' : '文章背景:清晰(点击切换毛玻璃)'
  }

  const init = () => {
    const panel = document.getElementById('rightside-config-hide')
    if (!panel) return

    let btn = document.getElementById(BTN_ID)
    if (!btn) {
      btn = document.createElement('button')
      btn.id = BTN_ID
      btn.type = 'button'
      btn.addEventListener('click', () => {
        const next = isSolid() ? 'translucent' : 'solid'
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch (e) {
          /* 隐私模式存不了就算了,本次会话内仍生效 */
        }
        if (next === 'solid') html.setAttribute('data-post-bg', 'solid')
        else html.removeAttribute('data-post-bg')
        render(btn)
      })
      // 排在暗色切换按钮后面,语义上是一组显示偏好
      const darkBtn = document.getElementById('darkmode')
      if (darkBtn && darkBtn.parentElement === panel) darkBtn.after(btn)
      else panel.appendChild(btn)
    }
    render(btn)
  }

  init()
})()
