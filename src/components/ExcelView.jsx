import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '../context/TranslationContext'
import StatusBadge from './StatusBadge'

export default function ExcelView() {
  const { entries } = useTranslation()
  const [search, setSearch] = useState('')
  const [sheetFilter, setSheetFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(() => {
    const base = sheetFilter === 'all' ? entries : entries.filter(e => e.sheet === sheetFilter)
    const cats = new Set(base.map(e => e.category))
    return ['all', ...Array.from(cats).sort()]
  }, [entries, sheetFilter])

  useEffect(() => {
    const valid = new Set(categories)
    if (categoryFilter !== 'all' && !valid.has(categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [categories, categoryFilter])

  const filtered = useMemo(() => {
    let list = entries
    if (sheetFilter !== 'all') list = list.filter(e => e.sheet === sheetFilter)
    if (categoryFilter !== 'all') list = list.filter(e => e.category === categoryFilter)
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(kw) ||
        e.cn.toLowerCase().includes(kw) ||
        e.en.toLowerCase().includes(kw) ||
        e.category.toLowerCase().includes(kw)
      )
    }
    return list
  }, [entries, sheetFilter, categoryFilter, search])

  const stats = useMemo(() => {
    const base = sheetFilter === 'all' ? entries : entries.filter(e => e.sheet === sheetFilter)
    return {
      total: base.length,
      pending: base.filter(e => e.status === 'pending').length,
      reviewed: base.filter(e => e.status === 'reviewed').length,
      archived: base.filter(e => e.status === 'archived').length,
    }
  }, [entries, sheetFilter])

  const categoryStats = useMemo(() => {
    const base = sheetFilter === 'all' ? entries : entries.filter(e => e.sheet === sheetFilter)
    const map = {}
    base.forEach(e => {
      if (!map[e.category]) map[e.category] = { total: 0, pending: 0 }
      map[e.category].total++
      if (e.status === 'pending') map[e.category].pending++
    })
    return map
  }, [entries, sheetFilter])

  const categoryColors = ['#4a9eff', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6',
    '#e74c3c', '#1abc9c', '#3498db', '#e84393', '#00b894']

  return (
    <div className="excel-view">
      <div className="stats-bar">
        <span>总条目: <strong>{stats.total}</strong></span>
        <span className="stat-pending">待翻译: <strong>{stats.pending}</strong></span>
        <span className="stat-reviewed">已翻译: <strong>{stats.reviewed}</strong></span>
        <span className="stat-archived">已归档: <strong>{stats.archived}</strong></span>
      </div>

      <div className="excel-toolbar">
        <div className="filter-group">
          <select value={sheetFilter} onChange={e => { setSheetFilter(e.target.value); setCategoryFilter('all') }}>
            <option value="all">全部 Sheet</option>
            <option value="语言配置表">语言配置表（客户端）</option>
            <option value="服务器语言配置表">服务器语言配置表</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="category-select">
            <option value="all">全部功能分类</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat} ({categoryStats[cat]?.total || 0}条)</option>
            ))}
          </select>
          <input type="text" placeholder="搜索 name / cn / en..." value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
        </div>
        <span className="result-count">共 {filtered.length} 条</span>
      </div>

      {categoryFilter === 'all' && (
        <div className="category-chips">
          {categories.filter(c => c !== 'all').map(cat => {
            const stat = categoryStats[cat] || { total: 0, pending: 0 }
            const ci = categories.indexOf(cat) % categoryColors.length
            return (
              <button key={cat} className="category-chip" style={{ '--chip-color': categoryColors[ci] }}
                onClick={() => setCategoryFilter(cat)}
                title={`${cat}: ${stat.total}条, ${stat.pending}条待翻译`}>
                <span className="chip-dot" style={{ background: categoryColors[ci] }}></span>
                {cat}
                <span className="chip-count">{stat.total}</span>
                {stat.pending > 0 && <span className="chip-pending">{stat.pending}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="excel-table-wrapper">
        <table className="excel-table" key={`${categoryFilter}-${sheetFilter}-${entries.length}`}>
          <thead>
            <tr>
              <th>#</th>
              <th>Sheet</th>
              <th>功能分类</th>
              <th>name</th>
              <th>cn</th>
              <th>en (已确认)</th>
              <th>param</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="empty-cell">暂无数据</td></tr>
            ) : (
              filtered.map((entry, idx) => {
                const ci = categories.indexOf(entry.category) % categoryColors.length
                return (
                  <tr key={`${entry.sheet}-${entry.name}`} className={!entry.en ? 'row-untranslated' : ''}>
                    <td className="cell-num">{idx + 1}</td>
                    <td className="cell-sheet">{entry.sheet === '语言配置表' ? '客户端' : '服务器'}</td>
                    <td className="cell-category">
                      <span className="category-tag" style={{ '--tag-color': categoryColors[ci] }}>{entry.category}</span>
                    </td>
                    <td className="cell-name">{entry.name}</td>
                    <td className="cell-cn">{entry.cn}</td>
                    <td className="cell-en">{entry.en || <span className="en-empty">待翻译</span>}</td>
                    <td className="cell-param">{entry.param || '-'}</td>
                    <td><StatusBadge status={entry.status} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
