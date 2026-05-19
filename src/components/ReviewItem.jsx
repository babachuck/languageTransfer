import React, { useRef, useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { useTranslation } from '../context/TranslationContext'

export default function ReviewItem({ entry, onArchive, onEdit, selected, onToggleSelect, autoFocus }) {
  const { confirmTranslation } = useTranslation()
  const textareaRef = useRef(null)
  const cardRef = useRef(null)

  // Auto-focus the first item
  useEffect(() => {
    if (autoFocus && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [autoFocus])

  const handleConfirm = () => {
    confirmTranslation(entry.name, entry.sheet)
  }

  const handleKeyDown = (e) => {
    // Enter = confirm (when not in textarea)
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      handleConfirm()
    }
    // E = focus textarea
    if (e.key === 'e' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
      e.preventDefault()
      textareaRef.current?.focus()
    }
  }

  const getSheetBadge = () => {
    if (entry.sheet === '语言配置表') return { label: '客户端', cls: 'badge-client' }
    return { label: '服务器', cls: 'badge-server' }
  }
  const sheetBadge = getSheetBadge()

  return (
    <div
      className={`review-card ${entry.status}`}
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header row */}
      <div className="rc-header">
        <div className="rc-header-left">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(entry)}
            className="rc-checkbox"
          />
          <span className={`rc-badge ${sheetBadge.cls}`}>{sheetBadge.label}</span>
          <span className="rc-badge rc-badge-cat">{entry.category}</span>
          <code className="rc-key">{entry.name}</code>
          <StatusBadge status={entry.status} />
        </div>
      </div>

      {/* CN / EN side-by-side */}
      <div className="rc-body">
        <div className="rc-panel rc-panel-cn">
          <div className="rc-panel-label">原文 (CN)</div>
          <div className="rc-cn-text">{entry.cn}</div>
        </div>
        <div className="rc-panel rc-panel-en">
          <div className="rc-panel-label">
            AI 建议 (EN)
            <span className="rc-edit-hint">点击编辑</span>
          </div>
          <textarea
            ref={textareaRef}
            className="rc-en-field"
            value={entry.aiSuggestion}
            onChange={e => onEdit(entry, e.target.value)}
            rows={2}
          />
          {entry.en && (
            <div className="rc-confirmed">
              <span className="rc-confirmed-label">已确认:</span>
              <span className="rc-confirmed-text">{entry.en}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="rc-footer">
        <div className="rc-shortcuts">
          <span><kbd>Enter</kbd> 确认</span>
          <span><kbd>E</kbd> 编辑</span>
          <span><kbd>A</kbd> 归档</span>
        </div>
        <div className="rc-actions">
          {entry.status === 'pending' && (
            <>
              <button className="rc-btn rc-btn-archive" onClick={() => onArchive(entry)}>归档</button>
              <button className="rc-btn rc-btn-confirm" onClick={handleConfirm}>确认</button>
            </>
          )}
          {entry.status === 'reviewed' && (
            <button className="rc-btn rc-btn-archive" onClick={() => onArchive(entry)}>归档</button>
          )}
        </div>
      </div>

      {/* Additional info */}
      <div className="rc-meta">
        {entry.param && <span className="rc-meta-item">param: {entry.param}</span>}
        {entry.reviewedAt && (
          <span className="rc-meta-item">
            {new Date(entry.reviewedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>
    </div>
  )
}
