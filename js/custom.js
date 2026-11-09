(() => {
  const HEADER_SELECTOR = '.post #page-header.post-bg:not(.not-top-img)'
  const CACHE_KEY = 'btf-post-header-color'
  const CACHE_TTL = 12 * 60 * 60 * 1000

  const rgbToHex = ([r, g, b], factor = 1) =>
    `#${[r, g, b]
      .map(value => Math.max(0, Math.min(255, Math.floor(value * factor))).toString(16).padStart(2, '0'))
      .join('')}`

  const normalizeHex = value => {
    if (!value) return null
    const hex = value.startsWith('#') ? value : `#${value}`
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null
  }

  const readCache = () => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}
    } catch (error) {
      return {}
    }
  }

  const getCachedColor = source => {
    const item = readCache()[source]
    if (!item || (item.expiration && item.expiration <= Date.now())) return null
    return item.value
  }

  const cacheColor = (source, color) => {
    try {
      const cache = readCache()
      cache[source] = { value: color, expiration: Date.now() + CACHE_TTL }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      // The header still works when localStorage is unavailable.
    }
  }

  const getAverageColor = image => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const color = [0, 0, 0]
    let count = 0

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 128) continue
      color[0] += pixels[index]
      color[1] += pixels[index + 1]
      color[2] += pixels[index + 2]
      count++
    }

    return count ? color.map(value => Math.round(value / count)) : null
  }

  const extractColor = source => new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.addEventListener('load', () => {
      try {
        const dominant = window.ColorThief?.getColorSync(image)
        const rgb = dominant ? dominant.array() : getAverageColor(image)
        if (!rgb) throw new Error('Unable to read cover color')
        resolve(rgbToHex(rgb, 0.8))
      } catch (error) {
        reject(error)
      }
    }, { once: true })
    image.addEventListener('error', () => reject(new Error(`Unable to load ${source}`)), { once: true })
    image.src = source
  })

  const applyHeaderColor = (header, value) => {
    const color = normalizeHex(value)
    if (!color) {
      header.style.removeProperty('--btf-header-theme')
      header.style.removeProperty('--btf-header-theme-op')
      header.style.removeProperty('--btf-header-theme-op-deep')
      return
    }

    const [r, g, b] = color.match(/[0-9a-f]{2}/gi).map(part => parseInt(part, 16))
    const brightness = Math.round((r * 299 + g * 587 + b * 114) / 1000)
    const adjusted = brightness < 125
      ? rgbToHex([Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 50, 255)])
      : color

    header.style.setProperty('--btf-header-theme', adjusted)
    header.style.setProperty('--btf-header-theme-op', `${adjusted}23`)
    header.style.setProperty('--btf-header-theme-op-deep', `${adjusted}dd`)
  }

  const initHeaderColor = () => {
    const header = document.querySelector(HEADER_SELECTOR)
    if (!header) return

    const cover = header.querySelector('#post-cover')
    const source = cover?.currentSrc || cover?.src
    if (!source) {
      applyHeaderColor(header, null)
      return
    }

    // 缓存键用未经解析的 src（与页头注入的键一致），
    // 这样首帧就能直接命中缓存，不必等图片加载完再取色。
    const cacheKey = cover.getAttribute('src') || source
    const cached = getCachedColor(cacheKey) || (cacheKey !== source ? getCachedColor(source) : null)
    if (cached) {
      applyHeaderColor(header, cached)
      return
    }

    extractColor(source)
      .then(color => {
        cacheColor(cacheKey, color)
        const currentHeader = document.querySelector(HEADER_SELECTOR)
        const currentCover = currentHeader?.querySelector('#post-cover')
        if (!currentHeader || !currentCover || (currentCover.getAttribute('src') || currentCover.src) !== cacheKey) return
        applyHeaderColor(currentHeader, color)
      })
      .catch(() => {
        const currentHeader = document.querySelector(HEADER_SELECTOR)
        if (currentHeader) applyHeaderColor(currentHeader, null)
      })
  }

  const initCoverTilt = () => {
    const cover = document.querySelector(`${HEADER_SELECTOR} .post-cover-aside`)
    const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!cover || !canTilt || reduceMotion) return

    const updateTilt = event => {
      const rect = cover.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      const rotateX = (0.5 - y) * 10
      const rotateY = (x - 0.5) * 10

      cover.style.setProperty('--post-cover-rotate-x', `${rotateX.toFixed(2)}deg`)
      cover.style.setProperty('--post-cover-rotate-y', `${rotateY.toFixed(2)}deg`)
      cover.style.setProperty('--post-cover-img-x', `${(-rotateY).toFixed(2)}px`)
      cover.style.setProperty('--post-cover-img-y', `${rotateX.toFixed(2)}px`)
    }

    const resetTilt = () => {
      cover.style.setProperty('--post-cover-rotate-x', '0deg')
      cover.style.setProperty('--post-cover-rotate-y', '0deg')
      cover.style.setProperty('--post-cover-img-x', '0px')
      cover.style.setProperty('--post-cover-img-y', '0px')
    }

    cover.addEventListener('pointerenter', updateTilt)
    cover.addEventListener('pointermove', updateTilt)
    cover.addEventListener('pointerleave', resetTilt)
    cover.addEventListener('pointercancel', resetTilt)
  }

  const initNavMenu = () => {
    const nav = document.getElementById('nav')
    // Butterfly 把文章标题放在 #blog-info 内（overflow:hidden），
    // 这里提升到 #nav 下，才能像 Solitude #page-name 一样居中显示。
    const pageTitle = document.querySelector('#nav #blog-info .nav-page-title')
    if (nav && pageTitle && pageTitle.parentElement !== nav) {
      nav.appendChild(pageTitle)
    }

    // 对齐 Solitude #page-name：点击文章标题胶囊回到顶部，而不是跳回首页。
    const titleLink = document.querySelector('#nav > .nav-page-title')
    if (titleLink && !titleLink.dataset.btfTotopBound) {
      titleLink.dataset.btfTotopBound = 'true'
      titleLink.addEventListener('click', event => {
        event.preventDefault()
        if (window.btf?.scrollToDest) window.btf.scrollToDest(0, 500)
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      titleLink.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        titleLink.click()
      })
    }
  }

  const initNavButtons = () => {
    const randomButton = document.querySelector('#random-post-button > .site-page')
    if (randomButton && !randomButton.dataset.btfRandomBound) {
      randomButton.dataset.btfRandomBound = 'true'
      randomButton.addEventListener('click', event => {
        event.preventDefault()
        let posts = []
        try {
          posts = JSON.parse(randomButton.dataset.randomPosts || '[]')
        } catch (error) {
          posts = []
        }
        if (!posts.length) return
        const target = posts[Math.floor(Math.random() * posts.length)]
        if (window.btf?.pjaxTo) window.btf.pjaxTo(target)
        else window.location.href = target
      })
    }

    const totop = document.getElementById('nav-totop')
    const totopBtn = totop?.querySelector('.totopbtn')
    const percent = totop?.querySelector('#percent')
    if (!totop || !totopBtn || totop.dataset.btfTotopBound) return
    totop.dataset.btfTotopBound = 'true'

    totopBtn.addEventListener('click', event => {
      event.preventDefault()
      if (window.btf?.scrollToDest) window.btf.scrollToDest(0, 500)
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    })

    const updateTotop = () => {
      const docEl = document.documentElement
      const scrollTop = window.scrollY || docEl.scrollTop
      const total = Math.max(
        document.body.scrollHeight,
        docEl.scrollHeight,
        document.body.offsetHeight,
        docEl.offsetHeight,
        document.body.clientHeight,
        docEl.clientHeight
      ) - docEl.clientHeight
      const value = total > 0 ? Math.round((scrollTop / total) * 100) : 0
      const isNearEnd = total - scrollTop < 100
      totop.classList.toggle('long', isNearEnd || value > 90)
      if (percent) {
        percent.textContent = isNearEnd || value > 90
          ? (totop.dataset.backToTop || '返回顶部')
          : value
      }
    }

    window.addEventListener('scroll', updateTotop, { passive: true })
    window.addEventListener('resize', updateTotop)
    updateTotop()
  }

  const initNavTooltip = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let tooltip = document.querySelector('.btf-tooltip')
    if (!tooltip) {
      tooltip = document.createElement('div')
      tooltip.className = 'btf-tooltip'
      tooltip.setAttribute('role', 'tooltip')
      document.body.appendChild(tooltip)
    }

    const hide = () => {
      tooltip.style.opacity = '0'
      tooltip.style.visibility = 'hidden'
    }

    const show = target => {
      const text = target.getAttribute('heotip')
      if (!text) return
      tooltip.textContent = text
      tooltip.style.visibility = 'hidden'
      tooltip.style.opacity = '0'
      tooltip.style.left = '0px'
      tooltip.style.top = '0px'
      tooltip.style.display = 'block'

      const rect = target.getBoundingClientRect()
      const tipRect = tooltip.getBoundingClientRect()
      const gap = 10
      const edge = 12
      const left = Math.max(
        edge,
        Math.min(rect.left + (rect.width - tipRect.width) / 2, window.innerWidth - tipRect.width - edge)
      )
      const top = rect.bottom + gap + tipRect.height > window.innerHeight - edge
        ? Math.max(edge, rect.top - tipRect.height - gap)
        : rect.bottom + gap

      tooltip.style.left = `${Math.round(left)}px`
      tooltip.style.top = `${Math.round(top)}px`
      tooltip.style.visibility = 'visible'
      tooltip.style.opacity = '1'
    }

    document.querySelectorAll('#nav [heotip]').forEach(element => {
      if (element.dataset.btfTooltipBound) return
      element.dataset.btfTooltipBound = 'true'
      element.addEventListener('mouseenter', () => show(element))
      element.addEventListener('mouseleave', hide)
      element.addEventListener('focus', () => show(element))
      element.addEventListener('blur', hide)
    })

    document.querySelectorAll('#nav [role="button"][tabindex]').forEach(element => {
      if (element.dataset.btfKeyBound) return
      element.dataset.btfKeyBound = 'true'
      element.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        element.click()
      })
    })

    window.addEventListener('scroll', hide, { passive: true })
  }

  const init = () => {
    initHeaderColor()
    initCoverTilt()
    initNavMenu()
    initNavButtons()
    initNavTooltip()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }

  document.addEventListener('pjax:complete', init)
})()
