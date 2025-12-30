import React, { useEffect, useMemo, useRef, useState } from 'react'

import AddEditMedicationModal from './components/AddEditMedicationModal.jsx'
import PageHeader from './components/PageHeader.jsx'
import Sidebar from './components/Sidebar.jsx'
import AlertsView from './views/AlertsView.jsx'
import CatalogView from './views/CatalogView.jsx'
import ConsumptionSummaryView from './views/ConsumptionSummaryView.jsx'
import DashboardView from './views/DashboardView.jsx'
import InventoryView from './views/InventoryView.jsx'
import MonthlyConsumptionView from './views/MonthlyConsumptionView.jsx'
import OrderRequestView from './views/OrderRequestView.jsx'
import TertiaryPackagingView from './views/TertiaryPackagingView.jsx'
import CategoriesView from './views/CategoriesView.jsx'
import {
  downloadCatalogTemplateCsv,
  downloadInventoryTemplateCsv,
  downloadInventoryTemplateXml,
  downloadMonthlyConsumptionTemplateCsv,
  normalizeDateInput,
  readCsvAsJson,
  readCsvAsRows,
} from './csv.js'
import { store } from './data/store.js'
import { dataProvider, isSupabaseConfigured, supabaseProjectRef } from '../lib/supabaseClient.js'
import * as XLSX from 'xlsx'

export default function BodegaApp() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setSidebarOpen] = useState(true)

  const [medications, setMedications] = useState([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryType, setInventoryType] = useState('772')
  const [hideInventoryTotalNoMovement, setHideInventoryTotalNoMovement] = useState(false)
  const [inventoryPageSize, setInventoryPageSize] = useState(50)
  const [inventoryPageByType, setInventoryPageByType] = useState({ '771': 1, '772': 1 })

  const [showAddMedModal, setShowAddMedModal] = useState(false)
  const [editingMed, setEditingMed] = useState(null)

  const [appStatus, setAppStatus] = useState({ loading: true, message: '', type: '' })

  const fileInputRef = useRef(null)
  const [excelStatus, setExcelStatus] = useState({ loading: false, message: '', type: '' })

  const inventoryFileInputRef = useRef(null)
  const [inventoryStatus, setInventoryStatus] = useState({ loading: false, message: '', type: '' })

  const monthlyFileInputRef = useRef(null)
  const [monthlyStatus, setMonthlyStatus] = useState({ loading: false, message: '', type: '' })
  const [monthlyBatches, setMonthlyBatches] = useState([])
  const [selectedMonthlyBatchId, setSelectedMonthlyBatchId] = useState(null)

  const tertiaryFileInputRef = useRef(null)
  const [tertiaryStatus, setTertiaryStatus] = useState({ loading: false, message: '', type: '' })
  const [tertiaryPackaging, setTertiaryPackaging] = useState([])
  const [tertiarySearch, setTertiarySearch] = useState('')
  const [tertiaryPage, setTertiaryPage] = useState(1)
  const [tertiaryPageSize, setTertiaryPageSize] = useState(50)

  const categoriesFileInputRef = useRef(null)
  const [categoriesStatus, setCategoriesStatus] = useState({ loading: false, message: '', type: '' })
  const [medicationCategories, setMedicationCategories] = useState([])
  const [categoriesSearch, setCategoriesSearch] = useState('')
  const [categoriesPage, setCategoriesPage] = useState(1)
  const [categoriesPageSize, setCategoriesPageSize] = useState(50)

  const getTertiarySupabaseHint = (err) => {
    const raw = err?.message ? String(err.message) : ''
    const isSchemaCache = raw.toLowerCase().includes('schema cache') || raw.toLowerCase().includes('could not find the table')
    if (!isSchemaCache) return ''

    return (
      'Parece que en Supabase aún no existe (o no se ha refrescado) la tabla `public.tertiary_packaging`. ' +
      'Ejecuta `supabase/schema.sql` en Supabase (SQL Editor) y luego recarga el schema con: NOTIFY pgrst, \'reload schema\';'
    )
  }

  const getCategoriesSupabaseHint = (err) => {
    const raw = err?.message ? String(err.message) : ''
    const isSchemaCache = raw.toLowerCase().includes('schema cache') || raw.toLowerCase().includes('could not find the table')
    if (!isSchemaCache) return ''

    return (
      'Parece que en Supabase aún no existe (o no se ha refrescado) la tabla `public.medication_categories`. ' +
      'Ejecuta `supabase/schema.sql` en Supabase (SQL Editor) y luego recarga el schema con: NOTIFY pgrst, \'reload schema\';'
    )
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      setAppStatus({
        loading: true,
        message:
          dataProvider === 'supabase' && isSupabaseConfigured
            ? 'Conectando a Supabase...'
            : 'Cargando datos locales...',
        type: 'info',
      })

      try {
        const [loadedMedications, loadedMonthlyBatches, storedSelectedId] = await Promise.all([
          store.getMedications(),
          store.getMonthlyBatches(),
          store.getSelectedMonthlyBatchId?.(),
        ])

        if (cancelled) return
        setMedications(loadedMedications ?? [])
        const normalizedBatches = (loadedMonthlyBatches ?? []).map((b) => ({ ...b, id: b?.id != null ? String(b.id) : b.id }))
        setMonthlyBatches(normalizedBatches)

        try {
          const loadedTertiary = (await store.getTertiaryPackaging?.()) ?? []
          if (!cancelled) setTertiaryPackaging(loadedTertiary ?? [])
        } catch (err) {
          const hint = getTertiarySupabaseHint(err)
          if (!cancelled) {
            setTertiaryPackaging([])
            setTertiaryStatus({
              loading: false,
              message: hint ? `${String(err?.message || err || 'Error al cargar Empaque Terciario.')}. ${hint}` : String(err?.message || err || 'Error al cargar Empaque Terciario.'),
              type: 'error',
            })
          }
        }

        try {
          const loadedCategories = (await store.getMedicationCategories?.()) ?? []
          if (!cancelled) setMedicationCategories(loadedCategories ?? [])
        } catch (err) {
          const hint = getCategoriesSupabaseHint(err)
          if (!cancelled) {
            setMedicationCategories([])
            setCategoriesStatus({
              loading: false,
              message: hint
                ? `${String(err?.message || err || 'Error al cargar Categorías.')}. ${hint}`
                : String(err?.message || err || 'Error al cargar Categorías.'),
              type: 'error',
            })
          }
        }

        const normalizedStoredId = storedSelectedId != null ? String(storedSelectedId) : null
        const firstId = normalizedBatches?.[0]?.id ?? null
        const hasStored = normalizedStoredId && normalizedBatches.some((b) => b.id === normalizedStoredId)

        const nextSelectedId = hasStored ? normalizedStoredId : firstId
        setSelectedMonthlyBatchId(nextSelectedId)
        await store.setSelectedMonthlyBatchId?.(nextSelectedId)

        setAppStatus({ loading: false, message: '', type: '' })
      } catch (err) {
        if (cancelled) return
        setAppStatus({
          loading: false,
          message: err?.message ? String(err.message) : 'No se pudieron cargar los datos.',
          type: 'error',
        })
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [])

  const selectMonthlyBatch = (id) => {
    const nextId = id == null ? null : String(id)
    setSelectedMonthlyBatchId(nextId)
    store.setSelectedMonthlyBatchId?.(nextId)
  }

  const normalizeSigesCode = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''

    const digits = raw.replace(/\D/g, '')
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
    }

    return raw.replace(/\s+/g, ' ')
  }

  const parseNumberLoose = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return 0
    const compact = raw.replace(/\s/g, '')
    const hasComma = compact.includes(',')
    const hasDot = compact.includes('.')

    let normalized = compact
    if (hasComma && hasDot) {
      normalized = compact.replace(/,/g, '')
    } else if (hasComma && !hasDot) {
      normalized = compact.replace(/,/g, '.')
    }

    const num = Number.parseFloat(normalized)
    return Number.isFinite(num) ? num : 0
  }

  const lowStockItems = useMemo(
    () => medications.filter((m) => m.stock <= m.min_stock),
    [medications],
  )

  const stats = useMemo(
    () => ({
      totalItems: medications.length,
      lowStockCount: lowStockItems.length,
      totalStockValue: medications.reduce((acc, curr) => acc + curr.stock, 0),
      recentConsumptions: monthlyBatches[0]?.items?.length || 0,
    }),
    [medications, lowStockItems, monthlyBatches],
  )

  const filteredInventory = useMemo(() => {
    const selectedType = String(inventoryType || '772')
    const query = inventorySearch.trim().toLowerCase()

    const normalizeMergeKey = ({ siges_code, name }) => {
      const code = String(siges_code || '').trim()
      if (code) return `code:${code.toLowerCase()}`
      const n = String(name || '').trim().toLowerCase()
      return n ? `name:${n}` : ''
    }

    const sortLots = (lots) => {
      lots.sort((a, b) => {
        const batchCmp = String(a.batch).localeCompare(String(b.batch))
        if (batchCmp !== 0) return batchCmp
        return String(a.expiry_date).localeCompare(String(b.expiry_date))
      })
    }

    const group771 = (rows) => {
      const grouped = []
      const byKey = new Map()
      for (const m of rows) {
        const code = String(m.siges_code || '').trim()
        const name = String(m.name || '').trim()
        const key = `${code}||${name}`.toLowerCase()
        const entry = byKey.get(key)
        const lot = {
          id: m.id,
          batch: String(m.batch || '').trim() || 'S/N',
          expiry_date: m.expiry_date ? String(m.expiry_date).trim() : '',
          stock: Number(m.stock) || 0,
        }

        if (entry) {
          entry.lots.push(lot)
          entry.stock += lot.stock
        } else {
          const row = {
            id: `group:${key}`,
            inventory_type: '771',
            siges_code: code,
            name,
            lots: [lot],
            stock: lot.stock,
          }
          byKey.set(key, row)
          grouped.push(row)
        }
      }

      for (const row of grouped) sortLots(row.lots)
      return grouped
    }

    if (selectedType === '771') {
      const base771 = medications.filter((m) => String(m.inventory_type || '772') === '771')
      const grouped771 = group771(base771)
      if (!query) return grouped771
      return grouped771.filter((row) => {
        const lots = row.lots.map((l) => `${l.batch} ${l.expiry_date} ${l.stock}`).join(' ')
        const haystack = `${row.siges_code} ${row.name} ${lots}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    if (selectedType === 'total') {
      const movementByCodeLast4Months = (() => {
        const candidates = (monthlyBatches ?? []).slice().sort((a, b) => {
          const aDate = new Date(a?.created_at || a?.updated_at || 0).getTime()
          const bDate = new Date(b?.created_at || b?.updated_at || 0).getTime()
          return bDate - aDate
        })
        const recent = candidates.slice(0, 4)
        const byCode = new Map()
        for (const batch of recent) {
          for (const item of batch?.items ?? []) {
            const code = normalizeSigesCode(item?.siges_code)
            if (!code) continue
            const qty = Number(item?.quantity) || 0
            byCode.set(code, (byCode.get(code) || 0) + qty)
          }
        }
        return byCode
      })()

      const combined = new Map()

      const upsertEntry = ({ siges_code, name }) => {
        const key = normalizeMergeKey({ siges_code, name })
        if (!key) return null
        const existing = combined.get(key)
        if (existing) return existing
        const entry = {
          id: `total:${key}`,
          inventory_type: 'total',
          siges_code: String(siges_code || '').trim(),
          name: String(name || '').trim(),
          lots: [],
          stock772: 0,
          stock771: 0,
          stock: 0,
        }
        combined.set(key, entry)
        return entry
      }

      for (const m of medications) {
        const t = String(m.inventory_type || '772')
        if (t !== '771' && t !== '772') continue

        const entry = upsertEntry({ siges_code: m.siges_code, name: m.name })
        if (!entry) continue
        if (!entry.siges_code) entry.siges_code = String(m.siges_code || '').trim()
        if (!entry.name) entry.name = String(m.name || '').trim()

        if (t === '772') {
          entry.stock772 += Number(m.stock) || 0
        } else {
          const lot = {
            id: m.id,
            batch: String(m.batch || '').trim() || 'S/N',
            expiry_date: m.expiry_date ? String(m.expiry_date).trim() : '',
            stock: Number(m.stock) || 0,
          }
          entry.lots.push(lot)
          entry.stock771 += lot.stock
        }
      }

      const merged = Array.from(combined.values()).map((entry) => {
        sortLots(entry.lots)
        entry.stock = entry.stock772 + entry.stock771
        return entry
      })

      const hasAnyMonthlyData = (monthlyBatches ?? []).some((b) => (b?.items ?? []).length > 0)
      const filteredForMovement = hideInventoryTotalNoMovement && hasAnyMonthlyData
        ? merged.filter((row) => {
            const code = String(row.siges_code || '').trim()
            if (!code) return false
            return (movementByCodeLast4Months.get(code) || 0) > 0
          })
        : merged

      if (!query) return filteredForMovement
      return filteredForMovement.filter((row) => {
        const lots = row.lots.map((l) => `${l.batch} ${l.expiry_date} ${l.stock}`).join(' ')
        const haystack = `${row.siges_code} ${row.name} ${row.stock772} ${row.stock771} ${row.stock} ${lots}`.toLowerCase()
        return haystack.includes(query)
      })
    }

    const base = medications.filter((m) => String(m.inventory_type || '772') === selectedType)
    if (!query) return base
    return base.filter((m) => {
      const haystack = `${m.siges_code} ${m.name} ${m.category} ${m.batch} ${m.expiry_date} ${m.unit}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [hideInventoryTotalNoMovement, inventorySearch, medications, inventoryType, monthlyBatches])

  const inventoryPage = inventoryPageByType?.[String(inventoryType || '772')] ?? 1

  const paginatedInventory = useMemo(() => {
    const size = inventoryPageSize || 50
    const totalPages = Math.max(1, Math.ceil(filteredInventory.length / size))
    const safePage = Math.min(Math.max(inventoryPage, 1), totalPages)
    const start = (safePage - 1) * size
    return filteredInventory.slice(start, start + size)
  }, [filteredInventory, inventoryPage, inventoryPageSize])

  const inventoryCountForType = useMemo(() => {
    const selectedType = String(inventoryType || '772')
    if (selectedType === 'total') return filteredInventory.length
    if (selectedType !== '771') {
      return medications.filter((m) => String(m.inventory_type || '772') === selectedType).length
    }
    return filteredInventory.length
  }, [filteredInventory, inventoryType, medications])

  const canFilterInventoryTotalNoMovement = useMemo(
    () => (monthlyBatches ?? []).some((b) => (b?.items ?? []).length > 0),
    [monthlyBatches],
  )

  const refreshTertiaryPackaging = async () => {
    try {
      setTertiaryStatus({ loading: true, message: 'Sincronizando...', type: 'info' })
      const next = (await store.getTertiaryPackaging?.()) ?? []
      setTertiaryPackaging(next)
      setTertiaryStatus({ loading: false, message: `Sincronizado: ${next.length} registros.`, type: 'success' })
      window.setTimeout(() => setTertiaryStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      const hint = getTertiarySupabaseHint(err)
      setTertiaryStatus({
        loading: false,
        message: hint ? `${String(err?.message || 'No se pudo sincronizar.')}. ${hint}` : err?.message ? String(err.message) : 'No se pudo sincronizar.',
        type: 'error',
      })
    }
  }

  const refreshMedicationCategories = async () => {
    try {
      setCategoriesStatus({ loading: true, message: 'Sincronizando...', type: 'info' })
      const next = (await store.getMedicationCategories?.()) ?? []
      setMedicationCategories(next)
      setCategoriesStatus({ loading: false, message: `Sincronizado: ${next.length} registros.`, type: 'success' })
      window.setTimeout(() => setCategoriesStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      const hint = getCategoriesSupabaseHint(err)
      setCategoriesStatus({
        loading: false,
        message: hint ? `${String(err?.message || 'No se pudo sincronizar.')}. ${hint}` : err?.message ? String(err.message) : 'No se pudo sincronizar.',
        type: 'error',
      })
    }
  }

  const downloadTertiaryTemplateXlsx = () => {
    const rows = [
      ['CODIGO', 'MEDICAMENTO', 'EMPAQUE TERCIARIO'],
      ['110-16-0010', 'PARACETAMOL 500 MG., TABLETAS', 200.0],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Empaque')
    XLSX.writeFile(wb, 'empaque_terciario.xlsx')
  }

  const clearTertiaryPackaging = async () => {
    const ok = window.confirm('¿Desea eliminar toda la carga de Empaque Terciario? Esta acción no se puede deshacer.')
    if (!ok) return

    try {
      setTertiaryStatus({ loading: true, message: 'Eliminando...', type: 'info' })
      await store.clearTertiaryPackaging?.()
      setTertiaryPackaging([])
      setTertiaryStatus({ loading: false, message: 'Carga eliminada.', type: 'success' })
      window.setTimeout(() => setTertiaryStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      const hint = getTertiarySupabaseHint(err)
      setTertiaryStatus({
        loading: false,
        message: hint ? `${String(err?.message || 'No se pudo eliminar la carga.')}. ${hint}` : err?.message ? String(err.message) : 'No se pudo eliminar la carga.',
        type: 'error',
      })
    }
  }

  const processTertiaryPackagingXlsx = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setTertiaryStatus({ loading: true, message: `Procesando: ${file.name}`, type: 'info' })

    const reader = new FileReader()
    reader.onerror = () => {
      setTertiaryStatus({ loading: false, message: 'No se pudo leer el archivo.', type: 'error' })
    }
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames?.[0]
        if (!firstSheetName) throw new Error('El XLSX no tiene hojas.')

        const sheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false })
        const dataRows = Array.isArray(rows) ? rows : []

        const looksLikeHeader = (row) => {
          const normalized = (cell) =>
            String(cell ?? '')
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '')
          const a = normalized(row?.[0])
          const b = normalized(row?.[1])
          const c = normalized(row?.[2])
          return a.includes('siges') || a.includes('codigo') || b.includes('medicamento') || c.includes('cantidad')
        }

        const usable = looksLikeHeader(dataRows?.[0]) ? dataRows.slice(1) : dataRows

        const byMedicationName = new Map(
          (medications ?? [])
            .map((m) => [normalizeSigesCode(m.siges_code), String(m.name || '').trim()])
            .filter(([code]) => Boolean(code)),
        )

        const imported = usable
          .map((row, index) => {
            const siges_code = normalizeSigesCode(row?.[0])
            const medication_name_raw = String(row?.[1] ?? '').trim()
            const medication_name = medication_name_raw || byMedicationName.get(siges_code) || ''
            const tertiary_quantity = parseNumberLoose(row?.[2])
            if (!siges_code) return null
            return {
              id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + index,
              siges_code,
              medication_name,
              tertiary_quantity,
            }
          })
          .filter(Boolean)

        const saved = (await store.upsertTertiaryPackaging?.(imported)) ?? imported
        setTertiaryPackaging(saved)
        setTertiaryStatus({
          loading: false,
          message: `Empaque Terciario: ${imported.length} registros importados/actualizados.`,
          type: 'success',
        })
        window.setTimeout(() => setTertiaryStatus({ loading: false, message: '', type: '' }), 4000)
      } catch (err) {
        const hint = getTertiarySupabaseHint(err)
        setTertiaryStatus({
          loading: false,
          message: hint ? `${String(err?.message || 'Error al procesar/guardar el XLSX.')}. ${hint}` : err?.message ? String(err.message) : 'Error al procesar/guardar el XLSX.',
          type: 'error',
        })
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = null
  }

  const normalizeCategory = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (normalized === 'ordinario') return 'Ordinario'
    if (normalized === 'frio') return 'Frío'
    if (normalized === 'estupefaciente') return 'Estupefaciente'
    if (normalized === 'psicotropico') return 'Psicotrópico'
    if (normalized === 'alcohol') return 'Alcohol'
    if (normalized === 'suero') return 'Suero'
    if (normalized === 'compra local' || normalized === 'compralocal') return 'Compra Local'
    return ''
  }

  const downloadCategoriesTemplateXlsx = () => {
    const rows = [
      ['CODIGO', 'MEDICAMENTO', 'CATEGORIA'],
      ['110-16-0010', 'PARACETAMOL 500 MG., TABLETAS', 'Ordinario'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Categorias')
    XLSX.writeFile(wb, 'categorias.xlsx')
  }

  const clearMedicationCategories = async () => {
    const ok = window.confirm('¿Desea eliminar toda la carga de Categorías? Esta acción no se puede deshacer.')
    if (!ok) return

    try {
      setCategoriesStatus({ loading: true, message: 'Eliminando...', type: 'info' })
      await store.clearMedicationCategories?.()
      setMedicationCategories([])
      setCategoriesStatus({ loading: false, message: 'Carga eliminada.', type: 'success' })
      window.setTimeout(() => setCategoriesStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      const hint = getCategoriesSupabaseHint(err)
      setCategoriesStatus({
        loading: false,
        message: hint ? `${String(err?.message || 'No se pudo eliminar la carga.')}. ${hint}` : err?.message ? String(err.message) : 'No se pudo eliminar la carga.',
        type: 'error',
      })
    }
  }

  const processMedicationCategoriesXlsx = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCategoriesStatus({ loading: true, message: `Procesando: ${file.name}`, type: 'info' })

    const reader = new FileReader()
    reader.onerror = () => {
      setCategoriesStatus({ loading: false, message: 'No se pudo leer el archivo.', type: 'error' })
    }
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames?.[0]
        if (!firstSheetName) throw new Error('El XLSX no tiene hojas.')

        const sheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false })
        const dataRows = Array.isArray(rows) ? rows : []

        const looksLikeHeader = (row) => {
          const normalized = (cell) =>
            String(cell ?? '')
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '')
          const a = normalized(row?.[0])
          const b = normalized(row?.[1])
          const c = normalized(row?.[2])
          return a.includes('codigo') || a.includes('siges') || b.includes('medicamento') || c.includes('categoria')
        }

        const usable = looksLikeHeader(dataRows?.[0]) ? dataRows.slice(1) : dataRows

        const imported = []
        let unknownCategories = 0

        for (let index = 0; index < usable.length; index += 1) {
          const row = usable[index]
          const siges_code = normalizeSigesCode(row?.[0])
          const medication_name = String(row?.[1] ?? '').trim()
          const category = normalizeCategory(row?.[2])

          if (!siges_code) continue
          if (!category) {
            unknownCategories += 1
            continue
          }

          imported.push({
            id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + index,
            siges_code,
            medication_name,
            category,
          })
        }

        const saved = (await store.upsertMedicationCategories?.(imported)) ?? imported
        setMedicationCategories(saved)
        setCategoriesStatus({
          loading: false,
          message: `Categorías: ${imported.length} registros importados/actualizados.${unknownCategories ? ` (${unknownCategories} filas con categoría inválida omitidas)` : ''}`,
          type: 'success',
        })
        window.setTimeout(() => setCategoriesStatus({ loading: false, message: '', type: '' }), 4000)
      } catch (err) {
        const hint = getCategoriesSupabaseHint(err)
        setCategoriesStatus({
          loading: false,
          message: hint ? `${String(err?.message || 'Error al procesar/guardar el XLSX.')}. ${hint}` : err?.message ? String(err.message) : 'Error al procesar/guardar el XLSX.',
          type: 'error',
        })
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = null
  }

  const filteredMedicationCategories = useMemo(() => {
    const query = categoriesSearch.trim().toLowerCase()
    const normalized = (medicationCategories ?? []).map((row) => ({
      ...row,
      siges_code: normalizeSigesCode(row?.siges_code),
      medication_name: String(row?.medication_name || '').trim(),
      category: String(row?.category || '').trim(),
    }))

    if (!query) return normalized
    return normalized.filter((row) => `${row.siges_code} ${row.medication_name} ${row.category}`.toLowerCase().includes(query))
  }, [categoriesSearch, medicationCategories])

  const paginatedMedicationCategories = useMemo(() => {
    const size = categoriesPageSize || 50
    const totalPages = Math.max(1, Math.ceil(filteredMedicationCategories.length / size))
    const safePage = Math.min(Math.max(categoriesPage, 1), totalPages)
    const start = (safePage - 1) * size
    return filteredMedicationCategories.slice(start, start + size)
  }, [categoriesPage, categoriesPageSize, filteredMedicationCategories])

  const filteredTertiaryPackaging = useMemo(() => {
    const query = tertiarySearch.trim().toLowerCase()
    const withFallbackName = (tertiaryPackaging ?? []).map((row) => {
      const code = normalizeSigesCode(row?.siges_code)
      const fallback = (medications ?? []).find((m) => normalizeSigesCode(m.siges_code) === code)?.name
      return {
        ...row,
        siges_code: code,
        medication_name: String(row?.medication_name || fallback || '').trim(),
        tertiary_quantity: Number(row?.tertiary_quantity) || 0,
      }
    })

    if (!query) return withFallbackName
    return withFallbackName.filter((row) => {
      const haystack = `${row.siges_code} ${row.medication_name}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [medications, tertiaryPackaging, tertiarySearch])

  const paginatedTertiaryPackaging = useMemo(() => {
    const size = tertiaryPageSize || 50
    const totalPages = Math.max(1, Math.ceil(filteredTertiaryPackaging.length / size))
    const safePage = Math.min(Math.max(tertiaryPage, 1), totalPages)
    const start = (safePage - 1) * size
    return filteredTertiaryPackaging.slice(start, start + size)
  }, [filteredTertiaryPackaging, tertiaryPage, tertiaryPageSize])

  const openNewMedication = () => {
    setEditingMed(null)
    setShowAddMedModal(true)
  }

  const openEditMedication = (med) => {
    setEditingMed(med)
    setShowAddMedModal(true)
  }

  const reloadMedications = async () => {
    const next = await store.getMedications()
    setMedications(next ?? [])
  }

  const handleAddMedication = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const newMed = {
      id: editingMed ? editingMed.id : globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now(),
      inventory_type: editingMed?.inventory_type ?? String(inventoryType || '772'),
      siges_code: editingMed?.siges_code ?? '',
      sicop_classifier: editingMed?.sicop_classifier ?? '',
      sicop_identifier: editingMed?.sicop_identifier ?? '',
      name: String(formData.get('name') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      batch: String(formData.get('batch') || '').trim(),
      expiry_date: String(formData.get('expiry_date') || '').trim(),
      stock: Number.parseFloat(String(formData.get('stock') || '0')) || 0,
      min_stock: Number.parseFloat(String(formData.get('min_stock') || '0')) || 0,
      unit: String(formData.get('unit') || '').trim(),
    }

    try {
      setAppStatus({ loading: true, message: 'Guardando...', type: 'info' })
      await store.upsertMedication(newMed)
      await reloadMedications()
      setEditingMed(null)
      setShowAddMedModal(false)
      setAppStatus({ loading: false, message: '', type: '' })
    } catch (err) {
      setAppStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudo guardar el medicamento.',
        type: 'error',
      })
    }
  }

  const deleteMedication = async (id) => {
    try {
      setAppStatus({ loading: true, message: 'Eliminando...', type: 'info' })
      await store.deleteMedication(id)
      await reloadMedications()
      setAppStatus({ loading: false, message: '', type: '' })
    } catch (err) {
      setAppStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudo eliminar el medicamento.',
        type: 'error',
      })
    }
  }

  const clearCatalog = async () => {
    try {
      setAppStatus({ loading: true, message: 'Eliminando catálogo...', type: 'info' })
      await store.clearMedications()
      await reloadMedications()
      setAppStatus({ loading: false, message: '', type: '' })
    } catch (err) {
      setAppStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudo limpiar el catálogo.',
        type: 'error',
      })
    }
  }

  const makeMedicationKey = ({ siges_code, name }) => {
    const code = String(siges_code || '').trim()
    if (code) return `code:${code}`
    const normalizedName = String(name || '').trim().toLowerCase()
    if (normalizedName) return `name:${normalizedName}`
    return ''
  }

  const parseInventoryNumber = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return 0

    const compact = raw.replace(/\s/g, '')
    const hasComma = compact.includes(',')
    const hasDot = compact.includes('.')

    let normalized = compact
    if (hasComma && hasDot) {
      normalized = compact.replace(/,/g, '')
    } else if (hasComma && !hasDot) {
      normalized = compact.replace(/,/g, '.')
    }

    const num = Number.parseFloat(normalized)
    return Number.isFinite(num) ? num : 0
  }

  const normalizeDateFromXml = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return null

    const dateOnly = raw.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly

    const yyyymmdd = raw.replace(/\D/g, '')
    if (yyyymmdd.length === 8) {
      const yyyy = yyyymmdd.slice(0, 4)
      const mm = yyyymmdd.slice(4, 6)
      const dd = yyyymmdd.slice(6, 8)
      return `${yyyy}-${mm}-${dd}`
    }

    const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const dd = dmy[1].padStart(2, '0')
      const mm = dmy[2].padStart(2, '0')
      const yyyy = dmy[3]
      return `${yyyy}-${mm}-${dd}`
    }

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return null
  }

  const getXmlValue = (element, tagNames, attrNames = []) => {
    if (!element) return ''

    for (const tagName of tagNames) {
      const node = element.getElementsByTagName(tagName)?.[0]
      const value = node?.textContent != null ? String(node.textContent).trim() : ''
      if (value) return value
    }

    for (const attrName of attrNames) {
      const value = element.getAttribute?.(attrName)
      if (value != null && String(value).trim()) return String(value).trim()
    }

    return ''
  }

  const parseInventory771CrystalReportXml = (doc) => {
    const areaPairs = Array.from(doc.getElementsByTagNameNS('*', 'FormattedAreaPair'))
    const groups = areaPairs.filter(
      (pair) => pair.getAttribute('Level') === '4' && pair.getAttribute('Type') === 'Group',
    )
    if (!groups.length) return null

    const readFieldValue = (root, matcher) => {
      const objects = Array.from(root.getElementsByTagNameNS('*', 'FormattedReportObject'))
      for (const obj of objects) {
        const fieldName = obj.getAttribute?.('FieldName')
        if (!fieldName) continue
        if (!matcher(fieldName)) continue

        const valueNode = obj.getElementsByTagNameNS('*', 'Value')?.[0]
        const formattedNode = obj.getElementsByTagNameNS('*', 'FormattedValue')?.[0]
        const raw =
          (valueNode?.textContent != null ? String(valueNode.textContent) : '') ||
          (formattedNode?.textContent != null ? String(formattedNode.textContent) : '')
        const value = raw.trim()
        if (value) return value
      }
      return ''
    }

    const fieldIncludes = (snippet) => (fieldName) => String(fieldName).includes(snippet)

    const records = []
    for (const group of groups) {
      const codeRaw = readFieldValue(group, fieldIncludes('.PRODUCTO}'))
      const nameRaw = readFieldValue(group, fieldIncludes('.DSC_PRODUCTO}'))
      const siges_code = normalizeSigesCode(codeRaw)
      const name = String(nameRaw || '').trim()
      if (!siges_code || !name) continue

      const details = Array.from(group.getElementsByTagNameNS('*', 'FormattedAreaPair')).filter(
        (pair) => pair.getAttribute('Level') === '5' && pair.getAttribute('Type') === 'Details',
      )

      for (const detail of details) {
        const batch = readFieldValue(detail, fieldIncludes('.IDE_LOTE}')) || 'S/N'
        const stockRaw = readFieldValue(detail, fieldIncludes('.CAN_LOTE}')) || '0'
        const expiryRaw = readFieldValue(detail, fieldIncludes('.FEC_VENCIMIENTO}'))

        const stock = parseInventoryNumber(stockRaw)
        const expiry_date = normalizeDateFromXml(expiryRaw)

        if (!batch && !expiryRaw && stock === 0) continue

        records.push({
          siges_code,
          name,
          batch: String(batch).trim() || 'S/N',
          expiry_date,
          stock,
        })
      }
    }

    return records
  }

  const parseInventory771Xml = (xmlText) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(String(xmlText || ''), 'application/xml')
    if (doc.querySelector('parsererror')) throw new Error('XML inválido o mal formado.')

    const crystalRecords = parseInventory771CrystalReportXml(doc)
    if (Array.isArray(crystalRecords)) return crystalRecords

    const codeTags = [
      'CodigoSIGES',
      'CodigoSiges',
      'codigoSIGES',
      'codigoSiges',
      'Codigo',
      'codigo',
      'SIGES',
      'Siges',
      'siges_code',
    ]
    const nameTags = ['Medicamento', 'medicamento', 'Nombre', 'nombre', 'Descripcion', 'descripcion', 'Medication']
    const lotTags = ['Lote', 'lote', 'Batch', 'batch', 'LoteMedicamento', 'loteMedicamento']
    const expiryTags = [
      'Vencimiento',
      'vencimiento',
      'FechaVencimiento',
      'fechaVencimiento',
      'FechaCaducidad',
      'fechaCaducidad',
      'expiry_date',
      'ExpiryDate',
    ]
    const stockTags = ['Inventario', 'inventario', 'Stock', 'stock', 'Existencia', 'existencia', 'Cantidad', 'cantidad']

    const recordElements = new Set()
    for (const tagName of codeTags) {
      const nodes = doc.getElementsByTagName(tagName)
      for (const node of nodes) {
        let el = node.parentElement
        let hops = 0
        while (el && el !== doc.documentElement && hops < 6) {
          const hasLot = Boolean(getXmlValue(el, lotTags, ['lote', 'Lote', 'batch', 'Batch']))
          const hasExpiry = Boolean(getXmlValue(el, expiryTags, ['vencimiento', 'Vencimiento', 'expiry', 'Expiry']))
          const hasStock = Boolean(getXmlValue(el, stockTags, ['inventario', 'Inventario', 'stock', 'Stock']))
          if (hasLot || hasExpiry || hasStock) break
          el = el.parentElement
          hops += 1
        }
        if (el) recordElements.add(el)
      }
    }

    const records = []
    for (const el of recordElements) {
      const siges_code = getXmlValue(el, codeTags, ['CodigoSIGES', 'codigoSIGES', 'siges_code', 'Codigo', 'codigo'])
      const name = getXmlValue(el, nameTags, ['Medicamento', 'medicamento', 'Nombre', 'nombre']).trim()
      const batch = getXmlValue(el, lotTags, ['Lote', 'lote', 'Batch', 'batch']).trim()
      const expiryRaw = getXmlValue(el, expiryTags, ['Vencimiento', 'vencimiento', 'ExpiryDate', 'expiry_date']).trim()
      const stockRaw = getXmlValue(el, stockTags, ['Inventario', 'inventario', 'Stock', 'stock']).trim()

      if (!siges_code || !name) continue

      records.push({
        siges_code: normalizeSigesCode(siges_code),
        name: name || 'Sin nombre',
        batch: batch || 'S/N',
        expiry_date: normalizeDateFromXml(expiryRaw),
        stock: parseInventoryNumber(stockRaw),
      })
    }

    return records
  }

  const makeLotKey = ({ siges_code, name, batch, expiry_date }) => {
    const code = String(siges_code || '').trim()
    const normalizedName = String(name || '').trim().toLowerCase()
    const lot = String(batch || '').trim().toLowerCase()
    const expiry = expiry_date ? String(expiry_date).trim() : ''
    if (code) return `code:${code}|lot:${lot}|exp:${expiry}`
    return `name:${normalizedName}|lot:${lot}|exp:${expiry}`
  }

  const upsertInventory771FromXmlText = async ({ text }) => {
    const selectedType = '771'
    const records = parseInventory771Xml(text)
    const uniqueRecords = []
    const seenKeys = new Set()
    for (const record of records) {
      const key = makeLotKey(record)
      if (!key || seenKeys.has(key)) continue
      seenKeys.add(key)
      uniqueRecords.push(record)
    }

    const current = (await store.getMedications()) ?? []
    const existingForType = current.filter((m) => String(m.inventory_type || '772') === selectedType)
    const byKeyToId = new Map(
      existingForType
        .map((m) => [makeLotKey(m), m.id])
        .filter(([key]) => Boolean(key)),
    )

    const now = Date.now()
    const imported = uniqueRecords.map((r, index) => {
      const key = makeLotKey(r)
      const existingId = byKeyToId.get(key)
      const id = existingId ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : now + index)

      return {
        id,
        inventory_type: selectedType,
        siges_code: r.siges_code,
        sicop_classifier: '',
        sicop_identifier: '',
        name: r.name,
        category: 'General',
        batch: r.batch || 'S/N',
        expiry_date: r.expiry_date,
        stock: r.stock,
        min_stock: 0,
        unit: 'Unidad',
      }
    })

    await store.upsertMedications(imported)

    const after = (await store.getMedications()) ?? []
    const visibleCountForType = after.filter((m) => String(m.inventory_type || '772') === selectedType).length
    const totalCountByType = after.reduce((acc, m) => {
      const t = String(m.inventory_type || '772')
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})

    await reloadMedications()
    return { importedCount: imported.length, visibleCountForType, totalCountByType }
  }

  const looksLikeInventoryHeaderRow = (row) => {
    const normalized = (cell) =>
      String(cell ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')

    const a = normalized(row?.[0])
    const b = normalized(row?.[1])
    const c = normalized(row?.[2])
    return (
      a.includes('siges') ||
      a.includes('codigosiges') ||
      b.includes('medicamento') ||
      b.includes('nombre') ||
      c.includes('inventario') ||
      c.includes('stock')
    )
  }

  const upsertInventoryFromCsvText = async ({ text, type }) => {
    const selectedType = String(type || '772').trim() || '772'

    const rows = readCsvAsRows(text)
    const dataRows = looksLikeInventoryHeaderRow(rows?.[0]) ? rows.slice(1) : rows

    const hasThreeColumns = dataRows.some((row) => {
      const siges = String(row?.[0] ?? '').trim()
      const name = String(row?.[1] ?? '').trim()
      return Boolean(siges && name)
    })

    const data = hasThreeColumns ? null : readCsvAsJson(text)

    const current = (await store.getMedications()) ?? []
    const existingForType = current.filter((m) => String(m.inventory_type || '772') === selectedType)
    const byKeyToId = new Map(
      existingForType
        .map((m) => [makeMedicationKey(m), m.id])
        .filter(([key]) => Boolean(key)),
    )

    const now = Date.now()
    const importedMeds = (dataRows ?? [])
      .map((row, index) => {
        if (!hasThreeColumns) return null

        const siges_code = String(row?.[0] ?? '').trim()
        const name = String(row?.[1] ?? '').trim()
        if (!siges_code || !name) return null

        const key = makeMedicationKey({ siges_code, name })
        if (!key) return null

        const existingId = byKeyToId.get(key)
        const id = existingId ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : now + index)

        return {
          id,
          inventory_type: selectedType,
          siges_code,
          sicop_classifier: '',
          sicop_identifier: '',
          name,
          category: 'General',
          batch: 'S/N',
          expiry_date: normalizeDateInput(''),
          stock: parseInventoryNumber(row?.[2]),
          min_stock: 0,
          unit: 'Unidad',
        }
      })
      .filter(Boolean)

    const importedFromJson = (data ?? [])
      .map((row, index) => {
        if (hasThreeColumns) return null

        const siges_code = String(row.CodigoSIGES || '').trim()
        const name = String(row.Medicamento || row.Nombre || '').trim()
        const key = makeMedicationKey({ siges_code, name })
        if (!key) return null

        const existingId = byKeyToId.get(key)
        const id = existingId ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : now + index)

        return {
          id,
          inventory_type: selectedType,
          siges_code,
          sicop_classifier: String(row.ClasificadorSICOP || '').trim(),
          sicop_identifier: String(row.IdentificadorSICOP || '').trim(),
          name: name || 'Sin nombre',
          category: String(row.Categoria || 'General').trim() || 'General',
          batch: String(row.Lote || 'S/N').trim() || 'S/N',
          expiry_date: normalizeDateInput(row.Vencimiento),
          stock: parseInventoryNumber(row.Stock),
          min_stock: parseInventoryNumber(row.StockMinimo || 0),
          unit: String(row.Unidad || 'Unidad').trim() || 'Unidad',
        }
      })
      .filter(Boolean)

    const combined = hasThreeColumns ? importedMeds : importedFromJson

    await store.upsertMedications(combined)

    const after = (await store.getMedications()) ?? []
    const visibleCountForType = after.filter((m) => String(m.inventory_type || '772') === selectedType).length
    const totalCountByType = after.reduce((acc, m) => {
      const t = String(m.inventory_type || '772')
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})

    await reloadMedications()
    return { importedCount: combined.length, visibleCountForType, totalCountByType }
  }

  const processCsv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelStatus({ loading: true, message: 'Procesando archivo...', type: 'info' })

    const reader = new FileReader()
    reader.onerror = () => {
      setExcelStatus({ loading: false, message: 'No se pudo leer el archivo.', type: 'error' })
    }
    reader.onload = async (evt) => {
      try {
        const text = String(evt.target?.result || '')
        const data = readCsvAsJson(text)

        const now = Date.now()
        const importedMeds = data.map((row, index) => ({
          id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : now + index,
          inventory_type: '772',
          siges_code: String(row.CodigoSIGES || '').trim(),
          sicop_classifier: String(row.ClasificadorSICOP || '').trim(),
          sicop_identifier: String(row.IdentificadorSICOP || '').trim(),
          name: row.Medicamento || row.Nombre || 'Sin nombre',
          category: row.Categoria || 'General',
          batch: row.Lote || 'S/N',
          expiry_date: normalizeDateInput(row.Vencimiento),
          stock: parseInventoryNumber(row.Stock),
          min_stock: parseInventoryNumber(row.StockMinimo || 10),
          unit: row.Unidad || 'Unidad',
        }))

        await store.upsertMedications(importedMeds)
        await reloadMedications()
        setExcelStatus({
          loading: false,
          message: `Se han importado ${importedMeds.length} medicamentos con éxito.`,
          type: 'success',
        })
        window.setTimeout(() => setExcelStatus({ loading: false, message: '', type: '' }), 4000)
      } catch (err) {
        const rawMessage = err?.message ? String(err.message) : ''
        const isIntegerMismatch = rawMessage.includes('invalid input syntax for type integer')
        const extraHint = isIntegerMismatch
          ? 'Tu base de datos en Supabase tiene `stock`/`min_stock` como INTEGER. Ejecuta `supabase/schema.sql` (ALTER COLUMN a NUMERIC) o usa valores enteros.'
          : ''
        setExcelStatus({
          loading: false,
          message: extraHint ? `${rawMessage}. ${extraHint}` : rawMessage || 'Error al procesar/guardar el CSV.',
          type: 'error',
        })
      }
    }
    reader.readAsText(file)
    e.target.value = null
  }

  const downloadInventoryTemplate = (type) => {
    const selectedType = String(type || inventoryType || '772')
    if (selectedType === 'total') return
    if (selectedType === '771') return downloadInventoryTemplateXml(selectedType)
    return downloadInventoryTemplateCsv(selectedType)
  }

  const processInventoryFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const selectedType = String(inventoryType || '772')
    if (selectedType === 'total') {
      setInventoryStatus({ loading: false, message: 'Inventario total no admite carga de archivos.', type: 'error' })
      e.target.value = null
      return
    }
    const filename = String(file.name || '').toLowerCase()
    const isXml = filename.endsWith('.xml')
    const isCsv = filename.endsWith('.csv')

    if (selectedType === '771' && !isXml) {
      setInventoryStatus({ loading: false, message: 'Para inventario 771, selecciona un archivo .xml.', type: 'error' })
      e.target.value = null
      return
    }
    if (selectedType !== '771' && !isCsv) {
      setInventoryStatus({ loading: false, message: 'Para inventario 772, selecciona un archivo .csv.', type: 'error' })
      e.target.value = null
      return
    }

    setInventoryStatus({
      loading: true,
      message: `Procesando inventario ${selectedType}: ${file.name}`,
      type: 'info',
    })

    const reader = new FileReader()
    reader.onerror = () => {
      setInventoryStatus({ loading: false, message: 'No se pudo leer el archivo.', type: 'error' })
    }
    reader.onload = async (evt) => {
      try {
        const text = String(evt.target?.result || '')
        const result =
          selectedType === '771'
            ? await upsertInventory771FromXmlText({ text })
            : await upsertInventoryFromCsvText({ text, type: selectedType })
        const importedCount = result?.importedCount ?? 0
        const visibleCountForType = result?.visibleCountForType ?? 0

        const hint =
          importedCount > 0 && visibleCountForType === 0 && dataProvider === 'supabase' && isSupabaseConfigured
            ? 'Importó datos pero no se pueden listar. Revisa RLS/policies en Supabase para `medications` (SELECT/ALL para `anon`).'
            : ''
        setInventoryStatus({
          loading: false,
          message: `Inventario ${selectedType}: ${importedCount} medicamentos importados/actualizados.${hint ? ` ${hint}` : ''}`,
          type: 'success',
        })
        window.setTimeout(() => setInventoryStatus({ loading: false, message: '', type: '' }), 4000)
      } catch (err) {
        const rawMessage = err?.message ? String(err.message) : ''
        const isIntegerMismatch = rawMessage.includes('invalid input syntax for type integer')
        const extraHint = isIntegerMismatch
          ? 'Tu base de datos en Supabase tiene `stock`/`min_stock` como INTEGER. Ejecuta `supabase/schema.sql` (ALTER COLUMN a NUMERIC) y vuelve a intentar.'
          : ''
        setInventoryStatus({
          loading: false,
          message:
            extraHint
              ? `${rawMessage}. ${extraHint}`
              : rawMessage || `Error al procesar/guardar el ${selectedType === '771' ? 'XML' : 'CSV'}.`,
          type: 'error',
        })
      }
    }
    reader.readAsText(file)
    e.target.value = null
  }

  const clearInventory = async (type) => {
    const selectedType = String(type || inventoryType || '772')
    if (selectedType === 'total') return
    const ok = window.confirm(
      `¿Desea eliminar toda la carga del inventario ${selectedType}? Esta acción no se puede deshacer.`,
    )
    if (!ok) return

    try {
      setInventoryStatus({ loading: true, message: `Eliminando inventario ${selectedType}...`, type: 'info' })
      await store.clearMedicationsByInventoryType?.(selectedType)
      await reloadMedications()
      setInventoryStatus({
        loading: false,
        message: `Inventario ${selectedType} eliminado.`,
        type: 'success',
      })
      window.setTimeout(() => setInventoryStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      setInventoryStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudo eliminar el inventario.',
        type: 'error',
      })
    }
  }

  const deriveMonthLabelFromFilename = (filename) => {
    const base = String(filename || '')
      .replace(/\.[^/.]+$/, '')
      .trim()
    return base || 'Mes sin nombre'
  }

  const processMonthlyConsumptionCsv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const monthLabel = deriveMonthLabelFromFilename(file.name)
    setMonthlyStatus({ loading: true, message: `Procesando: ${file.name}`, type: 'info' })

    const reader = new FileReader()
    reader.onerror = () => {
      setMonthlyStatus({ loading: false, message: 'No se pudo leer el archivo.', type: 'error' })
    }
    reader.onload = async (evt) => {
      try {
        const text = String(evt.target?.result || '')
        const rows = readCsvAsRows(text)

        const looksLikeHeaderRow = (cells) =>
          (cells || []).some((cell) => /codigo|siges|medicamento|consumo|costo/i.test(String(cell || '')))

        const parseNumber = (value) => {
          const raw = String(value ?? '').trim()
          if (!raw) return 0
          const normalized =
            raw.includes(',') && raw.includes('.')
              ? raw.replace(/,/g, '')
              : raw.includes(',') && !raw.includes('.')
                ? raw.replace(/,/g, '.')
                : raw
          const asNumber = Number.parseFloat(normalized.replace(/\s+/g, ''))
          return Number.isFinite(asNumber) ? asNumber : 0
        }

        const dataRows = looksLikeHeaderRow(rows[0]) ? rows.slice(1) : rows

        const importedItems = dataRows
          .map((row) => {
            const siges_code = String(row?.[0] ?? '').trim()
            const medication_name = String(row?.[1] ?? '').trim()
            const quantity = parseNumber(row?.[2])
            const cost = parseNumber(row?.[3])

            if (!siges_code || !medication_name) return null

            return {
              id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + Math.random(),
              siges_code,
              medication_name,
              quantity,
              cost,
            }
          })
          .filter(Boolean)

        const saved = await store.saveMonthlyBatch({
          id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
          label: monthLabel,
          items: importedItems,
        })

        const nextBatches = await store.getMonthlyBatches()
        setMonthlyBatches(nextBatches ?? [])
        selectMonthlyBatch(saved?.id ?? null)

        setMonthlyStatus({
          loading: false,
          message: `Mes "${monthLabel}": ${importedItems.length} registros importados.`,
          type: 'success',
        })
        window.setTimeout(() => setMonthlyStatus({ loading: false, message: '', type: '' }), 4000)
      } catch (err) {
        setMonthlyStatus({
          loading: false,
          message: err?.message ? String(err.message) : 'Error al procesar/guardar el CSV.',
          type: 'error',
        })
      }
    }

    reader.readAsText(file)
    e.target.value = null
  }

  const refreshMonthlyBatches = async () => {
    try {
      setMonthlyStatus({ loading: true, message: 'Sincronizando consumos...', type: 'info' })
      const nextBatches = await store.getMonthlyBatches()
      const normalized = (nextBatches ?? []).map((b) => ({ ...b, id: b?.id != null ? String(b.id) : b.id }))
      setMonthlyBatches(normalized)

      const currentId = selectedMonthlyBatchId != null ? String(selectedMonthlyBatchId) : null
      const hasCurrent = currentId && normalized.some((b) => b.id === currentId)
      const nextSelectedId = hasCurrent ? currentId : normalized?.[0]?.id ?? null
      selectMonthlyBatch(nextSelectedId)

      const providerLabel =
        dataProvider === 'supabase' && isSupabaseConfigured
          ? `supabase${supabaseProjectRef ? ` (${supabaseProjectRef})` : ''}`
          : `local${isSupabaseConfigured ? ' (Supabase disponible pero no seleccionado)' : ' (Supabase no configurado)'}`

      const hint =
        normalized.length === 0 && dataProvider === 'supabase' && isSupabaseConfigured
          ? 'Si en Supabase ves meses cargados, revisa RLS/policies para `anon` (SELECT en `monthly_batches`).'
          : normalized.length === 0
            ? 'Si tus consumos están en Supabase, configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` y usa `VITE_DATA_PROVIDER=supabase`.'
            : ''

      setMonthlyStatus({
        loading: false,
        message: `Sincronizado (${providerLabel}): ${normalized.length} meses encontrados.${hint ? ` ${hint}` : ''}`,
        type: 'success',
      })
      window.setTimeout(() => setMonthlyStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      setMonthlyStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudieron sincronizar los consumos.',
        type: 'error',
      })
    }
  }

  const refreshInventories = async () => {
    try {
      setInventoryStatus({ loading: true, message: 'Sincronizando inventarios...', type: 'info' })
      const next = (await store.getMedications()) ?? []
      setMedications(next)

      const counts = next.reduce(
        (acc, m) => {
          const t = String(m.inventory_type || '772')
          acc[t] = (acc[t] || 0) + 1
          return acc
        },
        { '771': 0, '772': 0 },
      )

      const providerLabel =
        dataProvider === 'supabase' && isSupabaseConfigured
          ? `supabase${supabaseProjectRef ? ` (${supabaseProjectRef})` : ''}`
          : 'local'

      setInventoryStatus({
        loading: false,
        message: `Sincronizado (${providerLabel}): 771=${counts['771'] || 0}, 772=${counts['772'] || 0}.`,
        type: 'success',
      })
      window.setTimeout(() => setInventoryStatus({ loading: false, message: '', type: '' }), 4000)
    } catch (err) {
      setInventoryStatus({
        loading: false,
        message: err?.message ? String(err.message) : 'No se pudieron sincronizar los inventarios.',
        type: 'error',
      })
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        isSidebarOpen={isSidebarOpen}
        onSelectTab={setActiveTab}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <main className="flex-1 overflow-y-auto p-8">
        <PageHeader activeTab={activeTab} onNewMedication={openNewMedication} />

        {appStatus.message && (
          <div
            className={`mb-6 p-3 rounded-lg text-xs flex items-center justify-between gap-3 ${
              appStatus.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
          >
            <span>{appStatus.message}</span>
            <button
              type="button"
              onClick={() => setAppStatus({ loading: false, message: '', type: '' })}
              className="text-[11px] font-bold hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            medications={medications}
            excelStatus={excelStatus}
            fileInputRef={fileInputRef}
            onChooseFile={() => fileInputRef.current?.click()}
            onDownloadTemplate={downloadCatalogTemplateCsv}
            onFileChange={processCsv}
            onEditMedication={openEditMedication}
            onDeleteMedication={deleteMedication}
            onClearCatalog={clearCatalog}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            consumptions={monthlyBatches[0]?.items || []}
            lowStockItems={lowStockItems}
            onViewAllConsumptions={() => setActiveTab('consumption-monthly')}
            onEditMedication={openEditMedication}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventoryType={inventoryType}
            onInventoryTypeChange={(type) => {
              setInventoryType(type)
              setInventorySearch('')
              setInventoryPageByType((prev) => ({ ...prev, [String(type || '772')]: 1 }))
              setInventoryStatus({ loading: false, message: '', type: '' })
            }}
            inventoryStatus={inventoryStatus}
            fileInputRef={inventoryFileInputRef}
            onChooseFile={() => inventoryFileInputRef.current?.click()}
            onFileChange={processInventoryFile}
            onDownloadTemplate={downloadInventoryTemplate}
            onRefresh={refreshInventories}
            canClear={String(inventoryType || '772') !== 'total' && inventoryCountForType > 0}
            onClearInventory={clearInventory}
            hideNoMovement={hideInventoryTotalNoMovement}
            canToggleHideNoMovement={canFilterInventoryTotalNoMovement}
            onToggleHideNoMovement={() => {
              setHideInventoryTotalNoMovement((prev) => !prev)
              setInventoryPageByType((prev) => ({ ...prev, total: 1 }))
            }}
            search={inventorySearch}
            onSearchChange={(value) => {
              setInventorySearch(value)
              setInventoryPageByType((prev) => ({ ...prev, [String(inventoryType || '772')]: 1 }))
            }}
            items={paginatedInventory}
            totalItems={filteredInventory.length}
            page={inventoryPage}
            pageSize={inventoryPageSize}
            onPageChange={(nextPage) => {
              const totalPages = Math.max(1, Math.ceil(filteredInventory.length / (inventoryPageSize || 1)))
              const safe = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)
              setInventoryPageByType((prev) => ({ ...prev, [String(inventoryType || '772')]: safe }))
            }}
            onPageSizeChange={(size) => {
              setInventoryPageSize(size)
              setInventoryPageByType((prev) => ({ ...prev, [String(inventoryType || '772')]: 1 }))
            }}
          />
        )}

        {activeTab === 'consumption-monthly' && (
          <MonthlyConsumptionView
            months={monthlyBatches}
            selectedMonthId={selectedMonthlyBatchId}
            onSelectMonth={selectMonthlyBatch}
            monthlyStatus={monthlyStatus}
            fileInputRef={monthlyFileInputRef}
            onChooseFile={() => monthlyFileInputRef.current?.click()}
            onFileChange={processMonthlyConsumptionCsv}
            onDownloadTemplate={downloadMonthlyConsumptionTemplateCsv}
            onRefresh={refreshMonthlyBatches}
          />
        )}

        {activeTab === 'consumption-summary' && (
          <ConsumptionSummaryView
            months={monthlyBatches}
            onRefresh={refreshMonthlyBatches}
            status={monthlyStatus}
          />
        )}

        {activeTab === 'order-request' && (
          <OrderRequestView
            medications={medications}
            months={monthlyBatches}
            tertiaryPackaging={tertiaryPackaging}
            inventoryStatus={inventoryStatus}
            monthlyStatus={monthlyStatus}
            onRefreshInventories={refreshInventories}
            onRefreshConsumptions={refreshMonthlyBatches}
          />
        )}

        {activeTab === 'tertiary-packaging' && (
          <TertiaryPackagingView
            status={tertiaryStatus}
            fileInputRef={tertiaryFileInputRef}
            onChooseFile={() => tertiaryFileInputRef.current?.click()}
            onFileChange={processTertiaryPackagingXlsx}
            onDownloadTemplate={downloadTertiaryTemplateXlsx}
            onRefresh={refreshTertiaryPackaging}
            canClear={(tertiaryPackaging ?? []).length > 0}
            onClear={clearTertiaryPackaging}
            search={tertiarySearch}
            onSearchChange={(value) => {
              setTertiarySearch(value)
              setTertiaryPage(1)
            }}
            items={paginatedTertiaryPackaging}
            totalItems={filteredTertiaryPackaging.length}
            page={tertiaryPage}
            pageSize={tertiaryPageSize}
            onPageChange={(nextPage) => {
              const totalPages = Math.max(1, Math.ceil(filteredTertiaryPackaging.length / (tertiaryPageSize || 1)))
              const safe = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)
              setTertiaryPage(safe)
            }}
            onPageSizeChange={(size) => {
              setTertiaryPageSize(size)
              setTertiaryPage(1)
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            status={categoriesStatus}
            fileInputRef={categoriesFileInputRef}
            onChooseFile={() => categoriesFileInputRef.current?.click()}
            onFileChange={processMedicationCategoriesXlsx}
            onDownloadTemplate={downloadCategoriesTemplateXlsx}
            onRefresh={refreshMedicationCategories}
            canClear={(medicationCategories ?? []).length > 0}
            onClear={clearMedicationCategories}
            search={categoriesSearch}
            onSearchChange={(value) => {
              setCategoriesSearch(value)
              setCategoriesPage(1)
            }}
            items={paginatedMedicationCategories}
            totalItems={filteredMedicationCategories.length}
            page={categoriesPage}
            pageSize={categoriesPageSize}
            onPageChange={(nextPage) => {
              const totalPages = Math.max(1, Math.ceil(filteredMedicationCategories.length / (categoriesPageSize || 1)))
              const safe = Math.min(Math.max(Number(nextPage) || 1, 1), totalPages)
              setCategoriesPage(safe)
            }}
            onPageSizeChange={(size) => {
              setCategoriesPageSize(size)
              setCategoriesPage(1)
            }}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView lowStockItems={lowStockItems} onEditMedication={openEditMedication} />
        )}
      </main>

      {showAddMedModal && (
        <AddEditMedicationModal
          editingMed={editingMed}
          onClose={() => setShowAddMedModal(false)}
          onSubmit={handleAddMedication}
        />
      )}
    </div>
  )
}
