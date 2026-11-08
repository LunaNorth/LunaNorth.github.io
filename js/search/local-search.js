/**
 * Butterfly local search, Solitude-compatible UI.
 *
 * Keeps Butterfly's hexo-generator-searchdb data format while using the
 * Solitude dialog structure, result list and interaction model.
 */
class LocalSearch {
  constructor ({ path = '', unescape = false, top_n_per_article = 1 }) {
    this.path = path
    this.unescape = unescape
    this.top_n_per_article = top_n_per_article
    this.isfetched = false
    this.isfetching = false
    this.datas = []
    this._unescapeDiv = unescape ? document.createElement('div') : null
    this._processedKeywords = null
  }

  _processKeywords (keywords) {
    if (this._processedKeywords) return this._processedKeywords
    this._processedKeywords = keywords.map(word => {
      if (this.unescape) {
        this._unescapeDiv.innerText = word
        return this._unescapeDiv.innerHTML
      }
      return word
    })
    return this._processedKeywords
  }

  getIndexByWord (words, text, caseSensitive = false) {
    const index = []
    const included = new Set()
    const processedWords = this._processKeywords(words)

    if (!caseSensitive) text = text.toLowerCase()
    processedWords.forEach((word, i) => {
      const wordLen = word.length
      if (wordLen === 0) return
      let startPosition = 0
      let position = -1
      const searchWord = caseSensitive ? word : word.toLowerCase()
      while ((position = text.indexOf(searchWord, startPosition)) > -1) {
        index.push({ position, word })
        included.add(words[i])
        startPosition = position + wordLen
      }
    })
    index.sort((left, right) => {
      if (left.position !== right.position) return left.position - right.position
      return right.word.length - left.word.length
    })
    return [index, included]
  }

  mergeIntoSlice (start, end, index) {
    let item = index[0]
    let { position, word } = item
    const hits = []
    const count = new Set()
    while (position + word.length <= end && index.length !== 0) {
      count.add(word)
      hits.push({ position, length: word.length })
      const wordEnd = position + word.length
      index.shift()
      while (index.length !== 0) {
        item = index[0]
        position = item.position
        word = item.word
        if (wordEnd > position) index.shift()
        else break
      }
    }
    return { hits, start, end, count: count.size }
  }

  highlightKeyword (val, slice) {
    const parts = []
    let index = slice.start
    for (const { position, length } of slice.hits) {
      parts.push(val.substring(index, position))
      index = position + length
      parts.push(`<mark class="search-keyword">${val.substring(position, position + length)}</mark>`)
    }
    parts.push(val.substring(index, slice.end))
    return parts.join('')
  }

  getResultItems (keywords) {
    const resultItems = []
    this._processedKeywords = null
    const highlightParam = keywords.join(' ')

    this.datas.forEach(({ title, content, url }) => {
      const [indexOfTitle, keysOfTitle] = this.getIndexByWord(keywords, title)
      const [indexOfContent, keysOfContent] = this.getIndexByWord(keywords, content)
      const includedCount = new Set([...keysOfTitle, ...keysOfContent]).size
      const hitCount = indexOfTitle.length + indexOfContent.length
      if (hitCount === 0) return

      const slicesOfTitle = []
      if (indexOfTitle.length !== 0) {
        slicesOfTitle.push(this.mergeIntoSlice(0, title.length, indexOfTitle))
      }

      const upperBound = parseInt(this.top_n_per_article, 10)
      let slicesOfContent = []
      while (indexOfContent.length !== 0) {
        const { position } = indexOfContent[0]
        const start = Math.max(0, position - 20)
        const end = Math.min(content.length, position + 100)
        slicesOfContent.push(this.mergeIntoSlice(start, end, indexOfContent))
      }
      if (upperBound >= 0) slicesOfContent = slicesOfContent.slice(0, upperBound)

      const resultUrl = new URL(url, location.origin)
      resultUrl.searchParams.append('highlight', highlightParam)

      const resultTitle = slicesOfTitle.length
        ? this.highlightKeyword(title, slicesOfTitle[0])
        : title
      const resultItem = `<li class="search-result-item"><a href="${resultUrl.href}"><span class="search-result-title">${resultTitle}</span></a></li>`

      resultItems.push({ item: resultItem, id: resultItems.length, hitCount, includedCount })
    })

    return resultItems
  }

  fetchData () {
    if (this.isfetched || this.isfetching) return
    this.isfetching = true
    const isXml = !this.path.endsWith('json')

    fetch(this.path)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        return response.text()
      })
      .then(res => {
        const parsed = isXml
          ? [...new DOMParser().parseFromString(res, 'text/xml').querySelectorAll('entry')].map(element => ({
            title: element.querySelector('title')?.textContent || '',
            content: element.querySelector('content')?.textContent || '',
            url: element.querySelector('url')?.textContent || ''
          }))
          : JSON.parse(res)

        this.datas = parsed
          .filter(data => data.title && data.url)
          .map(data => {
            data.title = data.title.trim()
            data.content = data.content ? data.content.trim().replace(/<[^>]+>/g, '') : ''
            data.url = decodeURIComponent(data.url).replace(/\/{2,}/g, '/')
            return data
          })
        this.isfetched = true
        this.isfetching = false
        window.dispatchEvent(new Event('search:loaded'))
      })
      .catch(error => {
        console.error('Local search data fetch failed:', error)
        this.datas = []
        this.isfetched = true
        this.isfetching = false
        window.dispatchEvent(new Event('search:loaded'))
      })
  }

  highlightText (node, slice, className) {
    const val = node.nodeValue
    let index = slice.start
    const children = []
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position))
      index = position + length
      const mark = document.createElement('mark')
      mark.className = className
      mark.appendChild(document.createTextNode(val.substring(position, position + length)))
      children.push(text, mark)
    }
    node.nodeValue = val.substring(index, slice.end)
    children.forEach(element => {
      node.parentNode.insertBefore(element, node)
    })
  }

  highlightSearchWords (body) {
    const params = new URL(location.href).searchParams.get('highlight')
    const keywords = params ? params.split(' ') : []
    if (!keywords.length || !body) return
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    const allNodes = []
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea, .mermaid')) allNodes.push(walk.currentNode)
    }
    allNodes.forEach(node => {
      const [indexOfNode] = this.getIndexByWord(keywords, node.nodeValue)
      if (!indexOfNode.length) return
      const slice = this.mergeIntoSlice(0, node.nodeValue.length, indexOfNode)
      this.highlightText(node, slice, 'search-keyword')
    })
  }
}

const initSolitudeSearch = () => {
  if (window.__btfSolitudeSearchInitialized) return

  const config = typeof GLOBAL_CONFIG !== 'undefined' ? GLOBAL_CONFIG.localSearch : null
  const dialog = document.querySelector('#local-search .search-dialog')
  if (!config || !dialog) return

  const $input = document.getElementById('search-input')
  const $results = document.getElementById('search-results')
  const $suggestions = document.getElementById('search-suggestions')
  const $pagination = document.getElementById('search-pagination')
  const $tips = document.getElementById('search-tips')
  const $mask = document.getElementById('search-mask')
  const $loadingStatus = document.getElementById('loading-status')
  const $loadingDatabase = document.getElementById('loading-database')
  const $close = dialog.querySelector('.search-close-button')
  const $searchButton = document.querySelector('#search-button > .search')
  if (!$input || !$results || !$mask || !$searchButton) return

  window.__btfSolitudeSearchInitialized = true
  const search = new LocalSearch({
    path: config.path,
    top_n_per_article: config.top_n_per_article,
    unescape: config.unescape
  })
  const languages = config.languages || {}
  const perPage = 10
  let currentResults = []
  let currentPage = 0
  let currentQuery = ''
  let currentSearchTime = 0

  const isMobile = () => window.innerWidth < 768
  const isOpen = () => dialog.style.display === 'flex'

  const fixSafariHeight = () => {
    if (isMobile()) dialog.style.setProperty('--search-height', `${window.innerHeight}px`)
    else dialog.style.removeProperty('--search-height')
  }

  const setQueryState = hasQuery => {
    if ($suggestions) $suggestions.hidden = hasQuery
    if ($results) $results.hidden = !hasQuery
  }

  const clearResults = () => {
    $results.innerHTML = ''
    if ($pagination) $pagination.innerHTML = ''
    if ($tips) $tips.innerHTML = ''
    currentResults = []
    currentPage = 0
    setQueryState(false)
  }

  const openSearch = () => {
    if (isOpen()) return
    btf.overflowPaddingR.add()
    btf.animateIn($mask, 'to_show 0.5s')
    dialog.style.display = 'flex'
    document.documentElement.classList.add('search-open')
    fixSafariHeight()
    window.addEventListener('resize', fixSafariHeight)
    setTimeout(() => $input.focus(), 100)
    if (!search.isfetched) search.fetchData()
    else if ($input.value.trim()) searchNow()
  }

  const closeSearch = () => {
    if (!isOpen()) return
    btf.overflowPaddingR.remove()
    btf.animateOut(dialog, 'search_close .5s')
    btf.animateOut($mask, 'to_hide 0.5s')
    document.documentElement.classList.remove('search-open')
    window.removeEventListener('resize', fixSafariHeight)
  }

  const showStatus = (message, className) => {
    $results.innerHTML = ''
    if ($tips) $tips.innerHTML = ''
    if ($pagination) $pagination.innerHTML = ''
    setQueryState(true)
    const status = document.createElement('span')
    status.className = className
    status.textContent = message
    $results.appendChild(status)
  }

  const renderPagination = (total, page) => {
    if (!$pagination) return
    $pagination.innerHTML = ''
    const pages = Math.ceil(total / perPage)
    if (pages <= 1) return

    const list = document.createElement('ul')
    list.className = 'pagination-list'
    for (let index = 0; index < pages; index++) {
      const item = document.createElement('li')
      item.className = 'pagination-item'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'pagination-button'
      button.textContent = index + 1
      button.setAttribute('aria-label', `${index + 1}`)
      if (index === page) {
        button.classList.add('select')
        button.setAttribute('aria-current', 'page')
      } else {
        button.addEventListener('click', () => {
          currentPage = index
          renderResults(currentPage)
          $results.scrollTop = 0
        })
      }
      item.appendChild(button)
      list.appendChild(item)
    }
    $pagination.appendChild(list)
  }

  const renderResults = page => {
    $results.innerHTML = ''
    if ($tips) $tips.innerHTML = ''
    if (!currentResults.length) {
      const empty = document.createElement('span')
      empty.className = 'search-result-empty'
      empty.textContent = (languages.hits_empty || '未找到符合您查询的内容：${query}')
        .replace(/\$\{query}/g, currentQuery)
      $results.appendChild(empty)
      $results.hidden = false
      if ($suggestions) $suggestions.hidden = true
      if ($pagination) $pagination.innerHTML = ''
      return
    }

    const start = page * perPage
    currentResults.slice(start, start + perPage).forEach(({ item }) => {
      const template = document.createElement('template')
      template.innerHTML = item.trim()
      const result = template.content.firstChild
      result.querySelector('a')?.addEventListener('click', closeSearch)
      $results.appendChild(result)
    })

    $results.hidden = false
    if ($suggestions) $suggestions.hidden = true
    if ($tips) {
      const count = document.createElement('span')
      count.className = 'search-result-count'
      count.innerHTML = (languages.hits_stats || '找到 ${hits} 条结果，用时 ${time} 毫秒')
        .replace(/\$\{hits}/g, `<b>${currentResults.length}</b>`)
        .replace(/\$\{time}/g, currentSearchTime)
      $tips.appendChild(count)
    }
    renderPagination(currentResults.length, page)
  }

  const searchNow = () => {
    if (!search.isfetched) {
      if (!search.isfetching) search.fetchData()
      return
    }

    const query = $input.value.trim()
    currentQuery = query
    if (!query) {
      clearResults()
      return
    }

    let searchText = query.toLowerCase()
    if (!search.path.endsWith('json')) {
      searchText = searchText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    const keywords = searchText.split(/[-\s]+/).filter(Boolean)
    const startTime = performance.now()
    const items = search.getResultItems(keywords)
    currentSearchTime = (performance.now() - startTime).toFixed(2)
    items.sort((left, right) => {
      if (left.includedCount !== right.includedCount) return right.includedCount - left.includedCount
      if (left.hitCount !== right.hitCount) return right.hitCount - left.hitCount
      return right.id - left.id
    })
    currentResults = items
    currentPage = 0
    renderResults(currentPage)
  }

  const debouncedSearch = () => {
    clearTimeout(debouncedSearch.timer)
    if (!$input.value.trim()) {
      searchNow()
      return
    }
    if ($loadingStatus) $loadingStatus.hidden = false
    debouncedSearch.timer = setTimeout(() => {
      searchNow()
      if ($loadingStatus) $loadingStatus.hidden = true
    }, 200)
  }

  $input.addEventListener('input', debouncedSearch)
  $searchButton.addEventListener('click', openSearch)
  $close?.addEventListener('click', closeSearch)
  $mask.addEventListener('click', closeSearch)
  $suggestions?.querySelectorAll('.tag-list').forEach(button => {
    button.addEventListener('click', () => {
      const query = button.dataset.query?.trim()
      if (!query) return
      $input.value = query
      searchNow()
      $input.focus()
    })
  })

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openSearch()
    } else if (event.code === 'Escape' && isOpen()) {
      closeSearch()
    }
  })

  window.addEventListener('search:loaded', () => {
    $loadingDatabase?.remove()
    if ($input.value.trim()) searchNow()
  })

  window.addEventListener('pjax:complete', () => {
    if (isOpen()) closeSearch()
    search.highlightSearchWords(document.getElementById('article-container'))
  })

  setQueryState(false)
  search.highlightSearchWords(document.getElementById('article-container'))
  if (config.preload) search.fetchData()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSolitudeSearch, { once: true })
} else {
  initSolitudeSearch()
}
