(() => {
  const config =
    typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG.darkBackground
      ? GLOBAL_CONFIG.darkBackground
      : null

  if (!config || !config.enable) return

  const root = document.documentElement

  // 这个脚本被挪到了 <head> 里执行（见 _config.butterfly.yml 的 inject.head），
  // 这样加载遮罩第一帧就能拿到正确的底色和图案，不会先闪一下默认紫底再跳成灰底。
  // 代价是此时 <body> 还没解析，#web_bg 并不存在 —— 但背景本来就是纯 CSS 画的
  // （#web_bg / #web_bg::after 读这里的 CSS 变量），脚本只负责往 <html> 上写变量，
  // 所以不需要等那个元素出现。

  // 挂到 <html> 上的开关类。CSS 全部靠它做判断：
  // 没有这个类 = 主题默认暗色（紫色底）；有这个类 = 中性灰底 + 线条图案。
  const PATTERN_CLASS = 'has-dark-bg-pattern'
  const count = Math.max(1, Number(config.count) || 42)
  const directory = config.path || '/images/background/'
  const fileName = config.file || 'pattern-{n}.min.svg'
  const useRandom = config.random !== false

  // 卡片表面压黑百分比 → CSS 变量。
  // 配置里写 10 就代表 10%，这里换算成 0.1 存进变量，
  // CSS 那边直接写 rgba(0, 0, 0, var(--btf-surface-alpha)) 就能用。
  const toAlpha = value => {
    const num = Number(value)
    return Number.isFinite(num) ? Math.min(1, Math.max(0, num / 100)) : 0.1
  }

  // 这两个跟明暗模式无关，只要配置存在就写上去，
  // 免得切主题时闪一下。
  root.style.setProperty('--btf-surface-alpha', String(toAlpha(config.surface_alpha ?? 10)))
  root.style.setProperty('--btf-dialog-alpha', String(toAlpha(config.dialog_alpha ?? 15)))

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
