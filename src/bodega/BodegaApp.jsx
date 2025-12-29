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
import {
  downloadCatalogTemplateCsv,
  downloadInventoryTemplateCsv,
  downloadMonthlyConsumptionTemplateCsv,
  normalizeDateInput,
  readCsvAsJson,
  readCsvAsRows,
} from './csv.js'
import { store } from './data/store.js'
import { dataProvider, isSupabaseConfigured, supabaseProjectRef } from '../lib/supabaseClient.js'

export default function BodegaApp() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setSidebarOpen] = useState(true)

  const [medications, setMedications] = useState([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryType, setInventoryType] = useState('772')
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
    const base = medications.filter((m) => String(m.inventory_type || '772') === selectedType)
    const query = inventorySearch.trim().toLowerCase()
    if (!query) return base
    return base.filter((m) => {
      const haystack = `${m.name} ${m.category} ${m.batch} ${m.unit}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [inventorySearch, medications, inventoryType])

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
    return medications.filter((m) => String(m.inventory_type || '772') === selectedType).length
  }, [inventoryType, medications])

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

  const processInventoryCsv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const selectedType = String(inventoryType || '772')
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
        const result = await upsertInventoryFromCsvText({ text, type: selectedType })
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
          message: extraHint ? `${rawMessage}. ${extraHint}` : rawMessage || 'Error al procesar/guardar el CSV.',
          type: 'error',
        })
      }
    }
    reader.readAsText(file)
    e.target.value = null
  }

  const clearInventory = async (type) => {
    const selectedType = String(type || inventoryType || '772')
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
            onFileChange={processInventoryCsv}
            onDownloadTemplate={downloadInventoryTemplateCsv}
            onRefresh={refreshInventories}
            canClear={inventoryCountForType > 0}
            onClearInventory={clearInventory}
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
