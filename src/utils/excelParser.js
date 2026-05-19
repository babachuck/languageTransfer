import * as XLSX from 'xlsx'

const SHEET1_NAME = '语言配置表'
const SHEET2_NAME = '服务器语言配置表'

/**
 * Find column indices by scanning header rows for field labels.
 * Returns { startRow, colName, colCn, colEn, colAi, colParam } (all 1-indexed)
 */
function detectColumns(data) {
  let startRow = -1
  let colName = 0, colCn = 0, colEn = 0, colAi = 0

  // Priority 1: find a row with exact "name", "cn", "en" labels (clean header row)
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue

    let fn = -1, fc = -1, fe = -1, fa = -1
    for (let j = 0; j < (row || []).length; j++) {
      const v = String(row[j] || '').trim()
      if (v === 'name') fn = j + 1
      if (v === 'cn') fc = j + 1
      if (v === 'en') fe = j + 1
      if (v.includes('AI翻译') || v.includes('AI建议')) fa = j + 1
    }

    if (fn > 0 && fc > 0 && fe > 0) {
      startRow = i + 1
      colName = fn; colCn = fc; colEn = fe

      // Scan ALL rows before startRow for AI column (may be in different header rows)
      for (let h = 0; h < startRow - 1; h++) {
        const hr = data[h]; if (!hr) continue
        for (let j = 0; j < (hr || []).length; j++) {
          const hdr = String(hr[j] || '').trim()
          if (hdr.includes('AI翻译') || hdr.includes('AI建议')) { colAi = j + 1; break }
        }
        if (colAi > 0) break
      }
      break
    }
  }

  // Priority 2: fallback with fuzzy matching
  if (startRow === -1) {
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i]
      if (!row) continue

      let fn = -1, fc = -1, fe = -1, fa = -1
      for (let j = 0; j < (row || []).length; j++) {
        const v = String(row[j] || '').trim().toLowerCase()
        if (v === 'name' || v === 'key值' || v.startsWith('key,')) fn = j + 1
        if (v === 'cn' || v === '中文') fc = j + 1
        if (v === 'en' || v === '英文') fe = j + 1
        if (v.includes('ai翻译') || v.includes('ai 翻译') || v.includes('ai建议')) fa = j + 1
      }

      if (fn > 0 && fc > 0 && fe > 0) {
        startRow = i + 1
        colName = fn; colCn = fc; colEn = fe; colAi = fa
        // Also scan earlier rows for AI column
        if (!colAi) {
          for (let h = 0; h < startRow - 1; h++) {
            const hr = data[h]; if (!hr) continue
            for (let j = 0; j < (hr || []).length; j++) {
              const hdr = String(hr[j] || '').trim().toLowerCase()
              if (hdr.includes('ai翻译') || hdr.includes('ai 翻译') || hdr.includes('ai建议')) { colAi = j + 1; break }
            }
            if (colAi > 0) break
          }
        }
        break
      }
    }
  }

  // Ultimate fallback
  if (startRow === -1) {
    startRow = 4
    colName = 4; colCn = 5; colEn = 6
  }

  return { startRow, colName, colCn, colEn, colAi: colAi > 0 ? colAi : 0 }
}

/**
 * Parse one sheet with auto-detected column positions.
 */
function parseSheet(data, sheetName) {
  const entries = []
  const isServer = sheetName === '服务器语言配置表'
  const { startRow, colName, colCn, colEn, colAi } = detectColumns(data)

  let currentCategory = isServer ? '服务器' : '未分类'
  const CAT_COL = 1  // Column B is always the category marker

  for (let i = startRow; i < data.length; i++) {
    const row = data[i]

    // Read by detected column positions
    const name = String(row[colName - 1] || '').trim()
    const cn = String(row[colCn - 1] || '').trim()

    // Track feature categories (client sheet only)
    if (!isServer) {
      const catMarker = String(row[CAT_COL] || '').trim()
      if (catMarker && catMarker !== '#des' && catMarker !== '备注' && catMarker !== '备注（不导出）') {
        currentCategory = catMarker
      }
    }

    if (!name || !cn) continue
    if (name === 'name' || name === 'S' || name.startsWith('key,')) continue

    const en = String(row[colEn - 1] || '').trim()

    // AI suggestion (if column was detected)
    let aiSuggestion = ''
    if (colAi > 0) {
      aiSuggestion = String(row[colAi - 1] || '').trim()
    }

    // Try to find param column - scan the header row for "param" or "p"
    // If not found, skip param (not critical)
    let param = ''
    for (let hdrIdx = 0; hdrIdx < startRow - 1; hdrIdx++) {
      const hdrRow = data[hdrIdx]
      if (!hdrRow) continue
      for (let j = 0; j < (hdrRow || []).length; j++) {
        const v = String(hdrRow[j] || '').trim().toLowerCase()
        if (v === 'param' || v === 'p' || v === '多语言参数处理' || v === '多语言特殊参数处理') {
          param = String(row[j] || '').trim()
          break
        }
      }
      if (param) break
    }

    const hasEn = !!en

    entries.push({
      sheet: sheetName,
      category: currentCategory,
      name,
      cn,
      en: en || '',
      aiSuggestion: hasEn ? '' : (aiSuggestion || ''),
      param,
      status: hasEn ? 'reviewed' : 'pending',
      reviewedAt: hasEn ? new Date().toISOString() : undefined,
    })
  }

  return entries
}

export function parseExcelFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const allEntries = []

  if (workbook.SheetNames.includes(SHEET1_NAME)) {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[SHEET1_NAME], { header: 1, defval: '' })
    const entries = parseSheet(data, SHEET1_NAME)
    allEntries.push(...entries)
  }

  if (workbook.SheetNames.includes(SHEET2_NAME)) {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[SHEET2_NAME], { header: 1, defval: '' })
    const entries = parseSheet(data, SHEET2_NAME)
    allEntries.push(...entries)
  }

  return { entries: allEntries }
}
