import * as XLSX from 'xlsx'

/**
 * Find name and en column indices by scanning header rows in the workbook.
 * Priority 1: exact "name" / "en" match
 * Priority 2: fuzzy match ("key值" / "英文")
 * Returns { colName, colEn, startRow } (1-indexed)
 */
function detectColumns(data) {
  let startRow = -1, colName = 0, colEn = 0

  // Priority 1: exact match for "name" and "en"
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue
    let fn = -1, fe = -1
    for (let j = 0; j < (row || []).length; j++) {
      const v = String(row[j] || '').trim()
      if (v === 'name') fn = j + 1
      if (v === 'en') fe = j + 1
    }
    if (fn > 0 && fe > 0) { startRow = i + 1; colName = fn; colEn = fe; break }
  }

  // Priority 2: fuzzy match
  if (startRow === -1) {
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i]
      if (!row) continue
      let fn = -1, fe = -1
      for (let j = 0; j < (row || []).length; j++) {
        const v = String(row[j] || '').trim().toLowerCase()
        if (v === 'name' || v === 'key值' || v.startsWith('key,')) fn = j + 1
        if (v === 'en' || v === '英文') fe = j + 1
      }
      if (fn > 0 && fe > 0) { startRow = i + 1; colName = fn; colEn = fe; break }
    }
  }

  if (startRow === -1) startRow = 4
  return { colName, colEn, startRow }
}

/**
 * Update an Excel sheet's en column based on reviewed translations.
 */
function updateSheet(wb, sheetName, entries) {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return 0

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const { startRow, colName, colEn } = detectColumns(data)

  if (colName === 0 || colEn === 0) return 0

  // Build lookup
  const entryMap = {}
  entries.forEach(e => { entryMap[e.name] = e.en })

  let updated = 0
  for (let i = startRow; i < data.length; i++) {
    const name = String(data[i][colName - 1] || '').trim()
    if (name && entryMap[name]) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: colEn - 1 })
      sheet[cellRef] = { t: 's', v: entryMap[name] }
      updated++
    }
  }

  return updated
}

/**
 * Export reviewed translations back to the original Excel buffer.
 */
export function exportToExcel(originalBuffer, entries) {
  const wb = XLSX.read(originalBuffer, { type: 'array' })
  const reviewed = entries.filter(e => e.status === 'reviewed' && e.en)

  let totalUpdated = 0

  const clientEntries = reviewed.filter(e => e.sheet === '语言配置表')
  if (clientEntries.length > 0) {
    totalUpdated += updateSheet(wb, '语言配置表', clientEntries)
  }

  const serverEntries = reviewed.filter(e => e.sheet === '服务器语言配置表')
  if (serverEntries.length > 0) {
    totalUpdated += updateSheet(wb, '服务器语言配置表', serverEntries)
  }

  const outBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return { blob, totalUpdated }
}
