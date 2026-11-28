(() => {
  const config =
    typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG.darkBackground
      ? GLOBAL_CONFIG.darkBackground
      : null

  if (!config || !config.enable) return

  const root = document.documentElement
  const webBg = document.getElementById('web_bg')

  if (!webBg) return

  // 挂到 <html> 上的开关类。CSS 全部靠它做判断：
  // 没有这个类 = 主题默认暗色（紫色底）；有这个类 = 中性灰底 + 线条图案。
  const PATTERN_CLASS = 'has-dark-bg-pattern'
  const count = Math.max(1, Number(config.count) || 42)
  const directory = config.path || '/images/background/'
  const fileName = config.file || 'pattern-{n}.min.svg'
  const useRandom = config.random !== false

  let currentIndex = 0

  const buildUrl = index => `${directory}${fileName.replace('{n}', index)}`

  const pickIndex = () => {
    if (!useRandom) return 1

    let index = Math.floor(Math.random() * count) + 1

    if (count > 1 && index === currentIndex) {
      index = index === count ? 1 : index + 1
    }

    return index
  }

  const apply = () => {
    const isDark = root.dataset.theme === 'dark'

    if (!isDark) {
      root.classList.remove(PATTERN_CLASS)
      root.style.removeProperty('--btf-dark-bg-pattern')
      return
    }

    currentIndex = pickIndex()

    root.classList.add(PATTERN_CLASS)
    root.style.setProperty('--btf-dark-bg-pattern', `url("${buildUrl(currentIndex)}")`)
    root.style.setProperty('--btf-dark-bg-opacity', String(config.opacity ?? 1))

    // color 留空 = 沿用主题暗色底色；填 #202020 就是 Astro/Stalux 同款中性灰
    root.style.setProperty('--btf-dark-bg-color', config.color || '#202020')
  }

  // 主题切换时 data-theme 会变化，监听后重新铺图
  const observer = new MutationObserver(() => apply())
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  // PJAX 翻页后换一张
  document.addEventListener('pjax:complete', () => apply())

  apply()
})()
