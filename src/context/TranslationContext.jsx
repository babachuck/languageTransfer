import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { saveToStorage, loadFromStorage, clearStorage } from '../utils/storage'
import { exportToExcel } from '../utils/excelExporter'
import builtinTranslations from '../data/builtinTranslations.json'
import localConfig from '../config/localConfig'

const TranslationContext = createContext(null)
const API_CONFIG_KEY = 'translation_api_config'

const DEFAULT_CONFIG = {
  mode: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',
  deployment: '',
  apiVersion: '',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload, fileLoaded: true, entryVersion: state.entryVersion + 1 }

    case 'UPDATE_ENTRY': {
      const { name, sheet, updates } = action.payload
      const entries = state.entries.map(e =>
        e.name === name && e.sheet === sheet ? { ...e, ...updates } : e
      )
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'BATCH_UPDATE_AI': {
      const { updates } = action.payload
      const updateMap = {}
      updates.forEach(u => { updateMap[`${u.sheet}|${u.name}`] = u.aiSuggestion })

      const entries = state.entries.map(e => {
        const key = `${e.sheet}|${e.name}`
        if (key in updateMap && !e.en) {
          return { ...e, aiSuggestion: updateMap[key], status: 'pending' }
        }
        return e
      })
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'CONFIRM_TRANSLATION': {
      const { name, sheet } = action.payload
      const entries = state.entries.map(e => {
        if (e.name === name && e.sheet === sheet && e.aiSuggestion) {
          return { ...e, en: e.aiSuggestion, status: 'reviewed', reviewedAt: new Date().toISOString() }
        }
        return e
      })
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'ARCHIVE_ENTRY': {
      const { name, sheet } = action.payload
      const entries = state.entries.map(e => {
        if (e.name === name && e.sheet === sheet) {
          return { ...e, status: 'archived', reviewedAt: new Date().toISOString() }
        }
        return e
      })
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'BATCH_CONFIRM': {
      const selected = action.payload
      const selectedSet = new Set(selected.map(s => `${s.sheet}|${s.name}`))
      const entries = state.entries.map(e => {
        const key = `${e.sheet}|${e.name}`
        if (selectedSet.has(key)) {
          return { ...e, en: e.aiSuggestion, status: 'reviewed', reviewedAt: new Date().toISOString() }
        }
        return e
      })
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'BATCH_ARCHIVE': {
      const selected = action.payload
      const selectedSet = new Set(selected.map(s => `${s.sheet}|${s.name}`))
      const entries = state.entries.map(e => {
        const key = `${e.sheet}|${e.name}`
        if (selectedSet.has(key)) {
          return { ...e, status: 'archived', reviewedAt: new Date().toISOString() }
        }
        return e
      })
      return { ...state, entries, entryVersion: state.entryVersion + 1 }
    }

    case 'SET_API_CONFIG':
      return { ...state, apiConfig: action.payload }

    case 'STORE_BUFFER':
      return { ...state, originalBuffer: action.payload }

    case 'SET_GLOSSARY':
      return { ...state, glossary: action.payload }

    case 'ADD_GLOSSARY_ENTRY': {
      const newEntry = action.payload // { cn, en }
      return { ...state, glossary: [...state.glossary, newEntry] }
    }

    case 'REMOVE_GLOSSARY_ENTRY': {
      const index = action.payload
      const glossary = state.glossary.filter((_, i) => i !== index)
      return { ...state, glossary }
    }

    case 'UPDATE_GLOSSARY_ENTRY': {
      const { index, cn, en } = action.payload
      const glossary = state.glossary.map((entry, i) =>
        i === index ? { cn, en } : entry
      )
      return { ...state, glossary }
    }

    case 'RESET':
      return { entries: [], fileLoaded: false, apiConfig: state.apiConfig, originalBuffer: null, glossary: state.glossary }

    default:
      return state
  }
}

function loadApiConfig() {
  // Start with local config defaults
  const defaults = { ...DEFAULT_CONFIG }

  if (localConfig.mode === 'azure' && localConfig.azure.endpoint) {
    defaults.mode = 'azure'
    defaults.apiKey = localConfig.azure.apiKey || ''
    defaults.baseUrl = localConfig.azure.endpoint.replace(/\/+$/, '')
    defaults.deployment = localConfig.azure.deployment || 'gpt-5-mini'
    defaults.apiVersion = localConfig.azure.apiVersion || '2024-12-01-preview'
  } else if (localConfig.mode === 'openai' && localConfig.openai.apiKey) {
    defaults.mode = 'openai'
    defaults.apiKey = localConfig.openai.apiKey
    defaults.model = localConfig.openai.model
    defaults.baseUrl = localConfig.openai.baseUrl
  }

  // Override with localStorage (user may have changed settings in UI)
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch (e) {}

  return defaults
}

const initialState = {
  entries: [],
  fileLoaded: false,
  apiConfig: loadApiConfig(),
  originalBuffer: null,
  glossary: [],
  entryVersion: 0,
}

export function TranslationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load entries from storage on mount
  useEffect(() => {
    const saved = loadFromStorage()
    if (saved && saved.entries) {
      dispatch({ type: 'SET_ENTRIES', payload: saved.entries })
    }
    if (saved && saved.glossary) {
      dispatch({ type: 'SET_GLOSSARY', payload: saved.glossary })
    }
  }, [])

  // Save entries + glossary to localStorage
  useEffect(() => {
    if (state.fileLoaded) {
      saveToStorage({ entries: state.entries, glossary: state.glossary })
    }
  }, [state.entries, state.fileLoaded, state.glossary])

  // Persist API config
  useEffect(() => {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(state.apiConfig))
  }, [state.apiConfig])

  const setEntries = useCallback((entries) => {
    dispatch({ type: 'SET_ENTRIES', payload: entries })
  }, [])

  const updateEntry = useCallback((name, sheet, updates) => {
    dispatch({ type: 'UPDATE_ENTRY', payload: { name, sheet, updates } })
  }, [])

  const confirmTranslation = useCallback((name, sheet) => {
    dispatch({ type: 'CONFIRM_TRANSLATION', payload: { name, sheet } })
  }, [])

  const archiveEntry = useCallback((name, sheet) => {
    dispatch({ type: 'ARCHIVE_ENTRY', payload: { name, sheet } })
  }, [])

  const batchConfirm = useCallback((selected) => {
    dispatch({ type: 'BATCH_CONFIRM', payload: selected })
  }, [])

  const batchArchive = useCallback((selected) => {
    dispatch({ type: 'BATCH_ARCHIVE', payload: selected })
  }, [])

  const resetData = useCallback(() => {
    clearStorage()
    dispatch({ type: 'RESET' })
  }, [])

  const setApiConfig = useCallback((config) => {
    dispatch({ type: 'SET_API_CONFIG', payload: config })
  }, [])

  const storeOriginalBuffer = useCallback((buffer) => {
    dispatch({ type: 'STORE_BUFFER', payload: buffer })
  }, [])

  // ── Glossary callbacks ──
  const addGlossaryEntry = useCallback((entry) => {
    dispatch({ type: 'ADD_GLOSSARY_ENTRY', payload: entry })
  }, [])

  const removeGlossaryEntry = useCallback((index) => {
    dispatch({ type: 'REMOVE_GLOSSARY_ENTRY', payload: index })
  }, [])

  const updateGlossaryEntry = useCallback((index, cn, en) => {
    dispatch({ type: 'UPDATE_GLOSSARY_ENTRY', payload: { index, cn, en } })
  }, [])

  const setGlossary = useCallback((entries) => {
    dispatch({ type: 'SET_GLOSSARY', payload: entries })
  }, [])

  const exportReviewed = useCallback(() => {
    if (!state.originalBuffer) return { blob: null, totalUpdated: 0, error: '未找到原始文件' }
    try {
      const result = exportToExcel(state.originalBuffer, state.entries)
      return result
    } catch (e) {
      return { blob: null, totalUpdated: 0, error: e.message }
    }
  }, [state.originalBuffer, state.entries])

  const getUntranslated = useCallback(() => {
    return state.entries.filter(e => !e.en && e.status !== 'archived')
  }, [state.entries])

  const getPendingEntries = useCallback(() => {
    return state.entries.filter(e => !e.en && e.aiSuggestion && e.status === 'pending')
  }, [state.entries])

  const getReviewedEntries = useCallback(() => {
    return state.entries.filter(e => e.status === 'reviewed')
  }, [state.entries])

  const getArchivedEntries = useCallback(() => {
    return state.entries.filter(e => e.status === 'archived')
  }, [state.entries])

  /**
   * Match untranslated entries against built-in translations (my ability).
   * Returns the count of matches found.
   */
  const generateFromBuiltin = useCallback(() => {
    const untranslated = state.entries.filter(e => !e.en && e.status !== 'archived')
    const updates = []

    untranslated.forEach(e => {
      const translation = builtinTranslations[e.name]
      if (translation) {
        updates.push({ name: e.name, sheet: e.sheet, aiSuggestion: translation })
      }
    })

    if (updates.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_AI', payload: { updates } })
    }

    return updates.length
  }, [state.entries])

  /**
   * Call OpenAI-compatible API to translate a batch of entries.
   * Supports both OpenAI format and Azure OpenAI format.
   */
  const generateFromApi = useCallback(async (entries, onProgress) => {
    const { apiKey, model, baseUrl, mode, deployment, apiVersion } = state.apiConfig
    if (!apiKey) throw new Error('请先配置 API Key')

    const updates = []
    const batchSize = 20
    const glossary = state.glossary || []

    // Build the API URL based on mode
    let apiUrl
    let authHeader
    if (mode === 'azure') {
      apiUrl = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
      authHeader = `Bearer ${apiKey}`
    } else {
      apiUrl = `${baseUrl}/chat/completions`
      authHeader = `Bearer ${apiKey}`
    }

    // For Azure, use deployment as model name
    const modelName = mode === 'azure' ? deployment : model

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const prompt = buildTranslatePrompt(batch, glossary)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`API 请求失败: ${response.status} - ${err}`)
      }

      const data = await response.json()
      try {
        const result = JSON.parse(data.choices[0].message.content)
        if (Array.isArray(result)) {
          result.forEach(r => {
            if (r.name && r.en) {
              updates.push({ name: r.name, sheet: '语言配置表', aiSuggestion: r.en })
            }
          })
        }
      } catch (e) {
        console.warn('API parse error for batch', i, data.choices[0].message.content)
      }

      if (onProgress) onProgress(Math.min(i + batchSize, entries.length), entries.length)
    }

    if (updates.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_AI', payload: { updates } })
    }
    return updates.length
  }, [state.apiConfig])

  const value = {
    entries: state.entries,
    fileLoaded: state.fileLoaded,
    apiConfig: state.apiConfig,
    originalBuffer: state.originalBuffer,
    glossary: state.glossary,
    entryVersion: state.entryVersion,
    setEntries,
    updateEntry,
    confirmTranslation,
    archiveEntry,
    batchConfirm,
    batchArchive,
    resetData,
    setApiConfig,
    storeOriginalBuffer,
    exportReviewed,
    addGlossaryEntry,
    removeGlossaryEntry,
    updateGlossaryEntry,
    setGlossary,
    getUntranslated,
    getPendingEntries,
    getReviewedEntries,
    getArchivedEntries,
    generateFromBuiltin,
    generateFromApi,
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(TranslationContext)
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider')
  return ctx
}

/**
 * System prompt for AI translation
 */
const SYSTEM_PROMPT = `You are a professional game localization translator for a mobile SLG / 4X strategy game.

The translations will be displayed directly in game UI, buttons, tabs, titles, HUD, missions, events, shop pages, mail, notifications, reward descriptions, and system messages. Prioritize clarity, brevity, natural wording, and player-facing readability.

Game domain:
City building, resource production, troop training, marching, heroes, equipment, technology, buffs, debuffs, timers, alliances, events, missions, shop, mail, notifications, rewards, combat, rankings, and general 4X strategy gameplay.

Style:
1. Use natural game UI wording commonly seen in published SLG / 4X mobile games.
2. Avoid stiff literal translation.
3. Keep translations short when possible, especially for buttons, tabs, titles, labels, and HUD text.
4. Do not over-localize, over-market, or make the text sound more dramatic than the source.
5. If the source text is short or ambiguous, choose a neutral and widely used game UI translation. Do not infer lore, character tone, or hidden meaning unless provided.

Strict rules:
1. Translate from {source_lang} to {target_lang}.
2. Do not add, remove, or rewrite information that is not present in the source.
3. Do not add lore, jokes, explanations, roleplay tone, or extra notes.
4. The glossary has higher priority than your general translation preference. If a glossary term appears, use the provided translation exactly unless minor grammatical inflection is required by the target language.
5. Preserve all placeholders, variables, numbers, tags, line breaks, and formatting marks exactly.
6. Do not translate or modify placeholders, variables, item IDs, config IDs, file names, resource names, HTML/XML tags, color codes, URLs, command-like strings, package identifiers, or technical identifiers.
7. If a string is an ID, code, URL, file name, pure variable, or cannot be safely translated, return it unchanged.
8. If the source text is already in the target language, return it unchanged.
9. Output only the required result. Do not include explanations, notes, alternative translations, confidence scores, Markdown, or comments.`

/**
 * Build a batch translation prompt for OpenAI API
 */
function buildTranslatePrompt(entries, glossary = []) {
  const items = entries.map(e => ({
    name: e.name,
    cn: e.cn,
    sheet: e.sheet,
  }))

  let prompt = 'Translate the following game text entries from Chinese to English. Preserve all placeholders (e.g., %{1}, %{damage}, [color=...], [url=...]). Output ONLY a JSON array with format [{"name": "...", "en": "..."}].'

  if (glossary.length > 0) {
    prompt += '\n\nGlossary (use these translations for matching terms):\n'
    glossary.forEach(g => {
      prompt += `- "${g.cn}" → "${g.en}"\n`
    })
  }

  prompt += `\n\nEntries:\n${JSON.stringify(items, null, 2)}`
  return prompt
}
