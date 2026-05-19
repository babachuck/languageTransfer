import React, { useState, useMemo, useRef } from 'react'
import { useTranslation } from '../context/TranslationContext'

export default function GlossaryView() {
  const { glossary, addGlossaryEntry, removeGlossaryEntry, updateGlossaryEntry, setGlossary } = useTranslation()

  const [cnInput, setCnInput] = useState('')
  const [enInput, setEnInput] = useState('')
  const [search, setSearch] = useState('')
  const [editIdx, setEditIdx] = useState(-1)
  const [editCn, setEditCn] = useState('')
  const [editEn, setEditEn] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const cnRef = useRef(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return glossary
    const kw = search.trim().toLowerCase()
    return glossary.filter(g =>
      g.cn.toLowerCase().includes(kw) || g.en.toLowerCase().includes(kw)
    )
  }, [glossary, search])

  const handleAdd = () => {
    const c = cnInput.trim()
    const e = enInput.trim()
    if (!c || !e) return
    addGlossaryEntry({ cn: c, en: e })
    setCnInput('')
    setEnInput('')
    cnRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && cnInput.trim() && enInput.trim()) {
      handleAdd()
    }
  }

  const startEdit = (idx) => {
    setEditIdx(idx)
    setEditCn(glossary[idx].cn)
    setEditEn(glossary[idx].en)
  }

  const saveEdit = () => {
    if (editCn.trim() && editEn.trim()) {
      updateGlossaryEntry(editIdx, editCn.trim(), editEn.trim())
    }
    setEditIdx(-1)
  }

  const cancelEdit = () => setEditIdx(-1)

  const doImport = () => {
    const text = importText.trim()
    if (!text) return
    let count = 0
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(p => p.cn && p.en)
        setGlossary([...glossary, ...valid])
        count = valid.length
      }
    } catch (e) {
      const lines = text.split('\n').filter(l => l.trim())
      const newEntries = []
      lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim())
        if (parts.length >= 2 && parts[0] && parts[1]) {
          newEntries.push({ cn: parts[0], en: parts.slice(1).join(',') })
        }
      })
      if (newEntries.length > 0) {
        setGlossary([...glossary, ...newEntries])
        count = newEntries.length
      }
    }
    setShowImport(false)
    setImportText('')
  }

  const handleClearAll = () => {
    if (glossary.length === 0) return
    if (window.confirm(`确定要清除全部 ${glossary.length} 条术语吗？`)) {
      setGlossary([])
    }
  }

  return (
    <div className="glossary-view">
      {/* Header */}
      <div className="glossary-header-card">
        <div className="glossary-header-left">
          <h2>术语表</h2>
          <p>用于 AI 翻译参考的术语库，优先级高于 AI 的通用翻译偏好</p>
        </div>
        <div className="glossary-header-right">
          <div className="glossary-metric">
            <span className="glossary-metric-num">{glossary.length}</span>
            <span className="glossary-metric-label">术语总数</span>
          </div>
        </div>
      </div>

      {/* Add card */}
      <div className="glossary-add-card">
        <div className="glossary-add-label">新增术语</div>
        <div className="glossary-add-row">
          <div className="glossary-add-field">
            <span className="glossary-add-tag">CN</span>
            <input
              ref={cnRef}
              className="glossary-add-input"
              placeholder="输入中文术语..."
              value={cnInput}
              onChange={e => setCnInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="glossary-add-arrow">→</div>
          <div className="glossary-add-field">
            <span className="glossary-add-tag glossary-add-tag-en">EN</span>
            <input
              className="glossary-add-input"
              placeholder="输入英文翻译..."
              value={enInput}
              onChange={e => setEnInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            className="glossary-add-btn"
            onClick={handleAdd}
            disabled={!cnInput.trim() || !enInput.trim()}
          >
            添加
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glossary-toolbar">
        <div className="glossary-toolbar-left">
          <div className="glossary-search-wrap">
            <span className="glossary-search-icon">🔍</span>
            <input
              className="glossary-search-input"
              placeholder="搜索术语..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="glossary-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
        <div className="glossary-toolbar-right">
          <button className="glossary-tb-btn" onClick={() => setShowImport(true)}>
            <span className="glossary-tb-icon">📥</span> 批量导入
          </button>
          <button className="glossary-tb-btn glossary-tb-btn-danger" onClick={handleClearAll}>
            <span className="glossary-tb-icon">🗑️</span> 清空
          </button>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="glossary-import-overlay" onClick={() => setShowImport(false)}>
          <div className="glossary-import-modal" onClick={e => e.stopPropagation()}>
            <div className="glossary-import-header">
              <h3>批量导入术语</h3>
              <button className="glossary-import-close" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <p className="glossary-import-hint">
              JSON 格式：<code>{'[{"cn":"英雄","en":"Hero"},{"cn":"技能","en":"Skill"}]'}</code>
              <br />
              或 CSV 格式（每行一组）：<code>英雄,Hero</code>
            </p>
            <textarea
              className="glossary-import-textarea"
              placeholder="在此粘贴术语数据..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={6}
            />
            <div className="glossary-import-actions">
              <button className="glossary-tb-btn" onClick={() => setShowImport(false)}>取消</button>
              <button className="glossary-add-btn" onClick={doImport} disabled={!importText.trim()}>
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glossary-empty-state">
          {search ? (
            <>
              <span className="glossary-empty-icon">🔍</span>
              <span>没有匹配「{search}」的术语</span>
            </>
          ) : (
            <>
              <span className="glossary-empty-icon">📖</span>
              <span>还没有术语，在上方添加第一组</span>
            </>
          )}
        </div>
      ) : (
        <div className="glossary-table-wrap">
          <table className="glossary-table">
            <thead>
              <tr>
                <th className="glossary-th-num">#</th>
                <th>中文术语</th>
                <th>英文翻译</th>
                <th className="glossary-th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => {
                const realIdx = glossary.indexOf(entry)
                const isEditing = editIdx === realIdx
                return (
                  <tr key={realIdx} className={`glossary-tr ${isEditing ? 'glossary-tr-editing' : ''}`}>
                    <td className="glossary-td-num">{realIdx + 1}</td>
                    <td className="glossary-td-cn">
                      {isEditing ? (
                        <input className="glossary-inline-input" value={editCn} onChange={e => setEditCn(e.target.value)} autoFocus />
                      ) : (
                        entry.cn
                      )}
                    </td>
                    <td className="glossary-td-en">
                      {isEditing ? (
                        <input className="glossary-inline-input" value={editEn} onChange={e => setEditEn(e.target.value)} />
                      ) : (
                        entry.en
                      )}
                    </td>
                    <td className="glossary-td-actions">
                      {isEditing ? (
                        <div className="glossary-action-group">
                          <button className="glossary-action-btn glossary-action-save" onClick={saveEdit} title="保存">✓</button>
                          <button className="glossary-action-btn glossary-action-cancel" onClick={cancelEdit} title="取消">✕</button>
                        </div>
                      ) : (
                        <div className="glossary-action-group">
                          <button className="glossary-action-btn glossary-action-edit" onClick={() => startEdit(realIdx)} title="编辑">✎</button>
                          <button className="glossary-action-btn glossary-action-del" onClick={() => removeGlossaryEntry(realIdx)} title="删除">✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
