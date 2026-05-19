import React, { useState, useMemo } from 'react'
import { useTranslation } from '../context/TranslationContext'

export default function GlossaryManager({ onClose }) {
  const { glossary, addGlossaryEntry, removeGlossaryEntry, updateGlossaryEntry, setGlossary } = useTranslation()

  const [cnInput, setCnInput] = useState('')
  const [enInput, setEnInput] = useState('')
  const [search, setSearch] = useState('')
  const [editIdx, setEditIdx] = useState(-1)
  const [editCn, setEditCn] = useState('')
  const [editEn, setEditEn] = useState('')

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

  const cancelEdit = () => {
    setEditIdx(-1)
  }

  const handleImport = () => {
    const text = window.prompt('粘贴术语表，每行格式：中文术语,英文翻译\n\n也可以粘贴 JSON 数组：[{"cn":"...","en":"..."}]')
    if (!text) return

    try {
      // Try JSON first
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        setGlossary([...glossary, ...parsed.filter(p => p.cn && p.en)])
        return
      }
    } catch (e) {
      // Not JSON, try CSV
    }

    // CSV format: cn,en per line
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
    }
  }

  const handleClearAll = () => {
    if (glossary.length === 0) return
    if (window.confirm(`确定要清除全部 ${glossary.length} 条术语吗？`)) {
      setGlossary([])
    }
  }

  return (
    <div className="glossary-overlay" onClick={onClose}>
      <div className="glossary-modal" onClick={e => e.stopPropagation()}>
        <div className="glossary-header">
          <h2>📖 术语表 ({glossary.length} 条)</h2>
          <div className="glossary-header-actions">
            <button className="glossary-btn glossary-btn-secondary" onClick={handleImport}>
              批量导入
            </button>
            <button className="glossary-btn glossary-btn-danger" onClick={handleClearAll}>
              清空
            </button>
            <button className="glossary-btn glossary-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <p className="glossary-hint">
          术语表中的中文术语会作为翻译参考提供给 AI，优先级高于 AI 的通用翻译偏好。
        </p>

        {/* Add new */}
        <div className="glossary-add-row">
          <input
            className="glossary-input"
            placeholder="中文术语"
            value={cnInput}
            onChange={e => setCnInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            className="glossary-input"
            placeholder="英文翻译"
            value={enInput}
            onChange={e => setEnInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="glossary-btn glossary-btn-primary"
            onClick={handleAdd}
            disabled={!cnInput.trim() || !enInput.trim()}
          >
            添加
          </button>
        </div>

        {/* Search */}
        <input
          className="glossary-search"
          placeholder="搜索术语..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="glossary-empty">
            {search ? '没有匹配的术语' : '还没有术语，在上方添加'}
          </div>
        ) : (
          <div className="glossary-table-wrap">
            <table className="glossary-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>中文术语</th>
                  <th>英文翻译</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => {
                  const realIdx = glossary.indexOf(entry)
                  const isEditing = editIdx === realIdx
                  return (
                    <tr key={realIdx}>
                      <td>{realIdx + 1}</td>
                      <td>
                        {isEditing ? (
                          <input className="glossary-inline-input" value={editCn} onChange={e => setEditCn(e.target.value)} />
                        ) : entry.cn}
                      </td>
                      <td>
                        {isEditing ? (
                          <input className="glossary-inline-input" value={editEn} onChange={e => setEditEn(e.target.value)} />
                        ) : entry.en}
                      </td>
                      <td className="glossary-td-actions">
                        {isEditing ? (
                          <>
                            <button className="glossary-btn-sm glossary-btn-primary" onClick={saveEdit}>保存</button>
                            <button className="glossary-btn-sm glossary-btn-secondary" onClick={cancelEdit}>取消</button>
                          </>
                        ) : (
                          <>
                            <button className="glossary-btn-sm glossary-btn-secondary" onClick={() => startEdit(realIdx)}>编辑</button>
                            <button className="glossary-btn-sm glossary-btn-danger" onClick={() => removeGlossaryEntry(realIdx)}>删除</button>
                          </>
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
    </div>
  )
}
