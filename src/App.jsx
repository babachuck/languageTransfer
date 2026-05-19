import React, { useState } from 'react'
import { TranslationProvider, useTranslation } from './context/TranslationContext'
import Header from './components/Header'
import UploadPage from './components/UploadPage'
import ExcelView from './components/ExcelView'
import ReviewView from './components/ReviewView'
import GlossaryView from './components/GlossaryView'
import { clearStorage } from './utils/storage'
import './App.css'

function AppContent() {
  const { fileLoaded, entryVersion, resetData, exportReviewed } = useTranslation()
  const [activeTab, setActiveTab] = useState('excel')
  const [fileName, setFileName] = useState('')
  const [msg, setMsg] = useState('')

  const showMsg = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 4000)
  }

  const handleFileLoaded = (name) => {
    setFileName(name)
    setActiveTab('excel')
  }

  const handleReset = () => {
    resetData()
    setFileName('')
    setActiveTab('excel')
  }

  const handleClearCache = () => {
    clearStorage()
    localStorage.removeItem('translation_api_config')
    resetData()
    setFileName('')
    setActiveTab('excel')
    showMsg('✅ 缓存已清除')
  }

  const handleExport = () => {
    const { blob, totalUpdated, error } = exportReviewed()
    if (error) { showMsg(`❌ 导出失败: ${error}`); return }
    if (totalUpdated === 0) {
      showMsg('⚠️ 没有已审核的翻译可导出，请在待审核视图中确认翻译后再试')
      return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace('.xlsx', '_已翻译.xlsx')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showMsg(`✅ 导出成功！已更新 ${totalUpdated} 条翻译`)
  }

  // 术语表分页不需要文件已加载，始终可用
  if (activeTab === 'glossary') {
    return (
      <div className="app">
        {msg && <div className="toast-message">{msg}</div>}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          fileName={fileName}
          onReset={handleReset}
          onClearCache={handleClearCache}
          onExport={handleExport}
        />
        <main className="app-main">
          <GlossaryView />
        </main>
      </div>
    )
  }

  if (!fileLoaded) {
    return (
      <>
        {msg && <div className="toast-message">{msg}</div>}
        <UploadPage onFileLoaded={handleFileLoaded} />
      </>
    )
  }

  return (
    <div className="app">
      {msg && <div className="toast-message">{msg}</div>}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fileName={fileName}
        onReset={handleReset}
        onClearCache={handleClearCache}
        onExport={handleExport}
      />
      <main className="app-main" key={entryVersion}>
        {activeTab === 'excel' ? <ExcelView /> : <ReviewView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <TranslationProvider>
      <AppContent />
    </TranslationProvider>
  )
}
