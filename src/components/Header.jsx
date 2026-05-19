import React from 'react'

export default function Header({ activeTab, onTabChange, fileName, onReset, onClearCache, onExport }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">🗂️ 多语言翻译审核系统</h1>
        {fileName && <span className="header-filename">当前文件: {fileName}</span>}
      </div>
      <div className="header-center">
        <button
          className={`tab-btn ${activeTab === 'excel' ? 'tab-active' : ''}`}
          onClick={() => onTabChange('excel')}
        >
          📊 配置表视图
        </button>
        <button
          className={`tab-btn ${activeTab === 'review' ? 'tab-active' : ''}`}
          onClick={() => onTabChange('review')}
        >
          ✅ 待审核视图
        </button>
        <button
          className={`tab-btn ${activeTab === 'glossary' ? 'tab-active' : ''}`}
          onClick={() => onTabChange('glossary')}
        >
          📖 术语表
        </button>
      </div>
      <div className="header-right">
        <button className="btn-clear-cache" onClick={onClearCache} title="清除浏览器缓存数据">
          🗑️ 清除缓存
        </button>
        {onExport && (
          <button className="btn-export" onClick={onExport}>
            ⬇️ 导出 Excel
          </button>
        )}
        {fileName && (
          <button className="btn-reset" onClick={onReset}>
            📁 重新上传
          </button>
        )}
      </div>
    </header>
  )
}
