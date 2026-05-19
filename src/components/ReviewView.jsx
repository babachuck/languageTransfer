import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from '../context/TranslationContext'
import ReviewItem from './ReviewItem'

export default function ReviewView() {
  const {
    getPendingEntries, getReviewedEntries, getArchivedEntries, getUntranslated,
    archiveEntry, updateEntry, batchConfirm, batchArchive,
    generateFromBuiltin, generateFromApi, apiConfig, setApiConfig,
  } = useTranslation()

  const [selected, setSelected] = useState([])
  const [activeSection, setActiveSection] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showGenPanel, setShowGenPanel] = useState(false)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [apiMode, setApiMode] = useState(apiConfig.mode || 'openai')
  const [apiKey, setApiKey] = useState(apiConfig.apiKey || '')
  const [apiModel, setApiModel] = useState(apiConfig.model || 'gpt-4o-mini')
  const [apiBaseUrl, setApiBaseUrl] = useState(apiConfig.baseUrl || 'https://api.openai.com/v1')
  const [apiDeployment, setApiDeployment] = useState(apiConfig.deployment || '')
  const [apiVersion, setApiVersion] = useState(apiConfig.apiVersion || '2024-12-01-preview')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [genMode, setGenMode] = useState('builtin')
  const [focusedIdx, setFocusedIdx] = useState(-1)

  // Data
  const pendingAll = useMemo(() => getPendingEntries(), [getPendingEntries])
  const reviewedAll = useMemo(() => getReviewedEntries(), [getReviewedEntries])
  const archivedAll = useMemo(() => getArchivedEntries(), [getArchivedEntries])
  const untranslated = useMemo(() => getUntranslated(), [getUntranslated])

  // Group pending entries by category
  const pendingByCategory = useMemo(() => {
    const groups = {}
    pendingAll.forEach(e => {
      if (!groups[e.category]) groups[e.category] = []
      groups[e.category].push(e)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [pendingAll])

  // Filter by search
  const filterBySearch = useCallback((list) => {
    if (!searchQuery.trim()) return list
    const kw = searchQuery.trim().toLowerCase()
    return list.filter(e =>
      e.name.toLowerCase().includes(kw) ||
      e.cn.toLowerCase().includes(kw) ||
      e.aiSuggestion.toLowerCase().includes(kw)
    )
  }, [searchQuery])

  const pending = useMemo(() => filterBySearch(pendingAll), [pendingAll, filterBySearch])
  const reviewed = useMemo(() => filterBySearch(reviewedAll), [reviewedAll, filterBySearch])
  const archived = useMemo(() => filterBySearch(archivedAll), [archivedAll, filterBySearch])

  // Progress stats
  const totalCount = pendingAll.length + reviewedAll.length + archivedAll.length
  const pendingPct = totalCount > 0 ? (pendingAll.length / totalCount) * 100 : 0
  const reviewedPct = totalCount > 0 ? (reviewedAll.length / totalCount) * 100 : 0
  const archivedPct = totalCount > 0 ? (archivedAll.length / totalCount) * 100 : 0

  // Keyboard shortcut: global Enter on review cards
  useEffect(() => {
    const handler = (e) => {
      // Arrow keys navigation in pending section
      if (activeSection === 'pending' && pending.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setFocusedIdx(prev => Math.min(prev + 1, pending.length - 1))
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setFocusedIdx(prev => Math.max(prev - 1, 0))
        }
      }
      // Ctrl+Enter: batch confirm selected
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && selected.length > 0) {
        e.preventDefault()
        handleBatchConfirm()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSection, pending.length, selected])

  // Reset focus index when section/search changes
  useEffect(() => { setFocusedIdx(-1) }, [activeSection, searchQuery])

  const handleConfirm = (entry) => {
    // Handled inside ReviewItem now
  }

  const handleArchive = (entry) => {
    archiveEntry(entry.name, entry.sheet)
  }

  const handleEdit = (entry, value) => {
    updateEntry(entry.name, entry.sheet, { aiSuggestion: value })
  }

  const handleToggleSelect = (entry) => {
    setSelected(prev => {
      const key = `${entry.sheet}|${entry.name}`
      if (prev.find(s => `${s.sheet}|${s.name}` === key)) {
        return prev.filter(s => `${s.sheet}|${s.name}` !== key)
      }
      return [...prev, entry]
    })
  }

  const handleSelectAll = () => {
    if (selected.length === pending.length) {
      setSelected([])
    } else {
      setSelected([...pending])
    }
  }

  const handleBatchConfirm = () => {
    if (selected.length === 0) return
    batchConfirm(selected.map(s => ({ name: s.name, sheet: s.sheet })))
    setSelected([])
  }

  const handleBatchArchive = () => {
    if (selected.length === 0) return
    batchArchive(selected.map(s => ({ name: s.name, sheet: s.sheet })))
    setSelected([])
  }

  const handleSaveApiConfig = () => {
    setApiConfig({
      mode: apiMode,
      apiKey,
      model: apiModel,
      baseUrl: apiBaseUrl,
      deployment: apiDeployment,
      apiVersion,
    })
    setShowApiSettings(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      let count
      if (genMode === 'builtin') {
        count = generateFromBuiltin()
        setGenProgress(`内置翻译匹配: ${count} 条`)
      } else {
        const toTranslate = untranslated.filter(e => !e.aiSuggestion)
        if (toTranslate.length === 0) {
          setGenProgress('没有需要翻译的条目')
        } else {
          count = await generateFromApi(toTranslate, (done, total) => {
            setGenProgress(`API 翻译中: ${done}/${total}`)
          })
          setGenProgress(`API 翻译完成: ${count} 条`)
        }
      }
    } catch (e) {
      setGenProgress(`错误: ${e.message}`)
    }
    setGenerating(false)
  }

  // Collect all items for the current section (for rendering)
  const currentItems = activeSection === 'pending' ? pending :
    activeSection === 'reviewed' ? reviewed : archived

  // Build category groups for pending section
  const filteredGroups = useMemo(() => {
    if (activeSection !== 'pending') return []
    const groups = {}
    pending.forEach(e => {
      if (!groups[e.category]) groups[e.category] = []
      groups[e.category].push(e)
    })
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [pending, activeSection])

  return (
    <div className="review-view">
      {/* Progress bar */}
      <div className="rv-progress">
        <div className="rv-progress-bar">
          <div className="rv-bar-seg rv-bar-pending" style={{ width: `${pendingPct}%` }} />
          <div className="rv-bar-seg rv-bar-reviewed" style={{ width: `${reviewedPct}%` }} />
          <div className="rv-bar-seg rv-bar-archived" style={{ width: `${archivedPct}%` }} />
        </div>
        <div className="rv-progress-stats">
          <span className="rv-stat rv-stat-pending">{pendingAll.length} 待审核</span>
          <span className="rv-stat rv-stat-reviewed">{reviewedAll.length} 已审核</span>
          <span className="rv-stat rv-stat-archived">{archivedAll.length} 已归档</span>
        </div>
      </div>

      {/* Tab buttons + toolbar */}
      <div className="rv-toolbar">
        <div className="rv-tabs">
          {[
            { key: 'pending', label: '待审核', count: pending.length, cls: 'rv-tab-pending' },
            { key: 'reviewed', label: '已审核', count: reviewed.length, cls: 'rv-tab-reviewed' },
            { key: 'archived', label: '已归档', count: archived.length, cls: 'rv-tab-archived' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`rv-tab ${activeSection === tab.key ? 'rv-tab-active' : ''} ${tab.cls}`}
              onClick={() => { setActiveSection(tab.key); setSelected([]); setFocusedIdx(-1) }}
            >
              {tab.label}
              <span className="rv-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="rv-toolbar-right">
          <input
            type="text"
            className="rv-search"
            placeholder="搜索 name 或 CN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button
            className="rv-gen-toggle"
            onClick={() => setShowGenPanel(!showGenPanel)}
          >
            {showGenPanel ? '收起 AI' : 'AI 生成'}
          </button>
        </div>
      </div>

      {/* Collapsible generate panel */}
      {showGenPanel && (
        <div className="rv-gen-panel">
          <div className="rv-gen-mode">
            <label><input type="radio" value="builtin" checked={genMode === 'builtin'} onChange={() => setGenMode('builtin')} /> 内置翻译</label>
            <label><input type="radio" value="api" checked={genMode === 'api'} onChange={() => setGenMode('api')} /> OpenAI API</label>
          </div>
          <div className="rv-gen-actions">
            <button className="rc-btn rc-btn-confirm" onClick={handleGenerate} disabled={generating || untranslated.length === 0}>
              {generating ? '生成中...' : '生成 AI 翻译'}
            </button>
            <button className="rc-btn rc-btn-archive" onClick={() => setShowApiSettings(!showApiSettings)}>API 设置</button>
          </div>
          {genProgress && <div className="rv-gen-progress">{genProgress}</div>}
          {showApiSettings && (
            <div className="rv-api-settings">
              <div className="rv-api-mode">
                <label className={apiMode === 'openai' ? 'active' : ''}>
                  <input type="radio" value="openai" checked={apiMode === 'openai'} onChange={() => setApiMode('openai')} />
                  OpenAI
                </label>
                <label className={apiMode === 'azure' ? 'active' : ''}>
                  <input type="radio" value="azure" checked={apiMode === 'azure'} onChange={() => setApiMode('azure')} />
                  Azure OpenAI
                </label>
              </div>

              {apiMode === 'azure' ? (
                <>
                  <input type="text" placeholder="Endpoint（https://xxx.openai.azure.com）" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} />
                  <input type="text" placeholder="Deployment 名称（如 gpt-5-mini）" value={apiDeployment} onChange={e => setApiDeployment(e.target.value)} />
                  <input type="password" placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                  <input type="text" placeholder="API Version（如 2024-12-01-preview）" value={apiVersion} onChange={e => setApiVersion(e.target.value)} />
                </>
              ) : (
                <>
                  <input type="password" placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                  <input type="text" placeholder="模型（如 gpt-4o-mini）" value={apiModel} onChange={e => setApiModel(e.target.value)} />
                  <input type="text" placeholder="接口地址（Base URL）" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} />
                </>
              )}
              <button className="rc-btn rc-btn-confirm" onClick={handleSaveApiConfig}>保存</button>
            </div>
          )}
        </div>
      )}

      {/* Batch bar (sticky) */}
      {activeSection !== 'archived' && currentItems.length > 0 && (
        <div className="rv-batch">
          <label className="rv-batch-select">
            <input type="checkbox" checked={selected.length === pending.length && pending.length > 0} onChange={handleSelectAll} />
            <span>全选 {pending.length} 条</span>
          </label>
          <span className="rv-batch-count">已选 {selected.length} 条</span>
          <div className="rv-batch-actions">
            {activeSection === 'pending' && (
              <button className="rc-btn rc-btn-confirm" disabled={selected.length === 0} onClick={handleBatchConfirm}>
                确认 ({selected.length})
              </button>
            )}
            <button className="rc-btn rc-btn-archive" disabled={selected.length === 0} onClick={handleBatchArchive}>
              归档 ({selected.length})
            </button>
          </div>
        </div>
      )}

      {/* Category-grouped review items (pending only) */}
      {activeSection === 'pending' && (
        <>
          {filteredGroups.length === 0 ? (
            <div className="rv-empty">
              {searchQuery ? '没有匹配结果' : '暂无比对条目'}
            </div>
          ) : (
            filteredGroups.map(([cat, items]) => {
              const totalInCat = pendingAll.filter(e => e.category === cat).length
              return (
                <div key={cat} className="rv-group">
                  <div className="rv-group-header">
                    <span className="rv-group-name">{cat}</span>
                    <span className="rv-group-count">{items.length} / {totalInCat}</span>
                    <div className="rv-group-bar">
                      <div className="rv-group-bar-fill" style={{ width: `${totalInCat > 0 ? (items.length / totalInCat) * 100 : 0}%` }} />
                    </div>
                  </div>
                  {items.map((entry, idx) => {
                    const globalIdx = pending.indexOf(entry)
                    return (
                      <ReviewItem
                        key={`${entry.sheet}-${entry.name}`}
                        entry={entry}
                        onArchive={handleArchive}
                        onEdit={handleEdit}
                        selected={!!selected.find(s => s.name === entry.name && s.sheet === entry.sheet)}
                        onToggleSelect={handleToggleSelect}
                        autoFocus={globalIdx === focusedIdx}
                      />
                    )
                  })}
                </div>
              )
            })
          )}
        </>
      )}

      {/* Flat list for reviewed/archived */}
      {activeSection !== 'pending' && (
        <>
          {currentItems.length === 0 ? (
            <div className="rv-empty">暂无比对条目</div>
          ) : (
            currentItems.map((entry, idx) => (
              <ReviewItem
                key={`${entry.sheet}-${entry.name}`}
                entry={entry}
                onArchive={handleArchive}
                onEdit={handleEdit}
                selected={!!selected.find(s => s.name === entry.name && s.sheet === entry.sheet)}
                onToggleSelect={handleToggleSelect}
                autoFocus={idx === focusedIdx}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}
