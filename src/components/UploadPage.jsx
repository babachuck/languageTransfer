import React, { useRef, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { parseExcelFile } from '../utils/excelParser'

export default function UploadPage({ onFileLoaded }) {
  const { setEntries, storeOriginalBuffer } = useTranslation()
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const { entries } = parseExcelFile(buffer)
      if (entries.length === 0) {
        alert('未找到有效数据，请确认 Excel 格式是否正确。')
        setLoading(false)
        return
      }
      setEntries(entries)
      storeOriginalBuffer(buffer)
      onFileLoaded(file.name)
    } catch (e) {
      alert('解析失败: ' + e.message)
      console.error(e)
    }
    setLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFile(file)
    } else {
      alert('请上传 .xlsx 或 .xls 文件')
    }
  }

  const handleClick = () => fileInputRef.current?.click()

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>开始翻译审核工作流</h2>
        <p className="upload-desc">
          上传 ZH 多语言配置表 Excel，系统将自动解析并展示所有条目与 AI 翻译建议。
        </p>

        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {loading ? (
            <div className="upload-loading">
              <div className="spinner"></div>
              <p>正在解析文件...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">📂</div>
              <p className="upload-text">拖拽 Excel 文件到此处</p>
              <p className="upload-subtext">或点击选择文件（支持 .xlsx / .xls）</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="upload-tips">
          <h4>💡 使用说明</h4>
          <ul>
            <li>上传文件必须是本工具生成的 <code>ZH多语言配置表_翻译辅助版.xlsx</code> 格式</li>
            <li>系统会自动识别 <strong>语言配置表</strong> 和 <strong>服务器语言配置表</strong> 两个 Sheet</li>
            <li><strong>配置表视图</strong>：查看完整数据表格，支持搜索</li>
            <li><strong>待审核视图</strong>：逐条审核 AI 翻译建议，确认后可归档</li>
            <li>数据自动保存在浏览器中，刷新页面不会丢失</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
