import React, { useMemo, useState } from 'react'

import { ClipboardList, RefreshCcw } from 'lucide-react'

function toNumber(value) {
  const asNumber =
    typeof value === 'number' ? value : Number(String(value ?? '').trim().replace(/\s/g, '').replace(/,/g, ''))
  return Number.isFinite(asNumber) ? asNumber : 0
}

function formatNumber(value) {
  const asNumber = toNumber(value)
  return new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(asNumber)
}

function mean(values) {
  if (!values.length) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function stdDev(values) {
  if (values.length <= 1) return 0
  const avg = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function buildMedicationKey({ siges_code, medication_name }) {
  const code = String(siges_code ?? '').trim()
  if (code) return `code:${code}`
  const name = String(medication_name ?? '').trim().toLowerCase()
  return name ? `name:${name}` : ''
}

function extractLast4DigitsNumber(code) {
  const digits = String(code || '').replace(/\D/g, '')
  if (digits.length < 4) return Number.POSITIVE_INFINITY
  return Number.parseInt(digits.slice(-4), 10)
}

function startsWith110(code) {
  return String(code || '').trim().startsWith('110')
}

function StatusBanner({ status }) {
  if (!status?.message) return null

  const styles =
    status.type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : status.type === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div className={`border rounded-lg px-4 py-3 text-sm ${styles}`}>
      <span>{status.message}</span>
    </div>
  )
}

export default function OrderRequestView({
  medications,
  months,
  inventoryStatus,
  monthlyStatus,
  onRefreshInventories,
  onRefreshConsumptions,
}) {
  const [monthsToRequest, setMonthsToRequest] = useState(3)
  const [search, setSearch] = useState('')
  const [hideZeroOrder, setHideZeroOrder] = useState(true)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)

  const computed = useMemo(() => {
    const lastThree = (months ?? []).slice(0, 3)
    const monthLabels = lastThree.map((m) => String(m?.label ?? '').trim()).filter(Boolean)

    const inventoryByCode = new Map()
    for (const med of medications ?? []) {
      const code = String(med?.siges_code ?? '').trim()
      if (!code) continue
      const invType = String(med?.inventory_type || '772')
      const current = inventoryByCode.get(code) ?? { inv771: 0, inv772: 0 }
      if (invType === '771') current.inv771 += toNumber(med?.stock)
      if (invType === '772') current.inv772 += toNumber(med?.stock)
      inventoryByCode.set(code, current)
    }

    const consumptionMap = new Map()
    lastThree.forEach((m, monthIndex) => {
      const items = m?.items ?? []
      for (const item of items) {
        const siges_code = String(item?.siges_code ?? '').trim()
        const medication_name = String(item?.medication_name ?? '').trim()
        const key = buildMedicationKey({ siges_code, medication_name })
        if (!key) continue

        const byKey = consumptionMap.get(key) ?? {
          siges_code,
          medication_name,
          perMonth: [0, 0, 0],
        }

        byKey.siges_code = byKey.siges_code || siges_code
        byKey.medication_name = byKey.medication_name || medication_name
        byKey.perMonth[monthIndex] += toNumber(item?.quantity)
        consumptionMap.set(key, byKey)
      }
    })

    const monthsCount = Math.max(0, Number(monthsToRequest) || 0)

    const rows = Array.from(consumptionMap.values()).map((m) => {
      const values = m.perMonth.slice(0, 3)
      const avg = mean(values)
      const sd = stdDev(values)
      const consumoTotal = avg + sd
      const code = String(m.siges_code ?? '').trim()
      const inventory = inventoryByCode.get(code) ?? { inv771: 0, inv772: 0 }
      const invTotal = toNumber(inventory.inv771) + toNumber(inventory.inv772)
      const pedidoRaw = consumoTotal * monthsCount - invTotal
      const pedido = Math.max(0, pedidoRaw)

      return {
        siges_code: code,
        medication_name: m.medication_name,
        perMonth: values,
        avg,
        sd,
        consumoTotal,
        inv771: inventory.inv771,
        inv772: inventory.inv772,
        invTotal,
        pedido,
      }
    })

    return { monthLabels, rows }
  }, [medications, months, monthsToRequest])

  const monthLabels = computed.monthLabels ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const baseRows = computed.rows ?? []
    const basePre = hideZeroOrder ? baseRows.filter((r) => toNumber(r.pedido) > 0) : baseRows
    const base = q
      ? basePre.filter((r) => `${r.siges_code} ${r.medication_name}`.toLowerCase().includes(q))
      : basePre

    return base.sort((a, b) => {
      const codeA = a?.siges_code || ''
      const codeB = b?.siges_code || ''

      const a110 = startsWith110(codeA)
      const b110 = startsWith110(codeB)
      if (a110 !== b110) return a110 ? -1 : 1

      const suffixA = extractLast4DigitsNumber(codeA)
      const suffixB = extractLast4DigitsNumber(codeB)
      if (suffixA !== suffixB) return suffixA - suffixB

      return String(codeA).localeCompare(String(codeB), 'es', { numeric: true, sensitivity: 'base' })
    })
  }, [computed.rows, hideZeroOrder, search])

  const totalItems = filtered.length
  const safePageSize = Math.max(1, Number(pageSize) || 50)
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1
  const end = Math.min(safePage * safePageSize, totalItems)
  const paginated = useMemo(() => {
    const startIndex = (safePage - 1) * safePageSize
    return filtered.slice(startIndex, startIndex + safePageSize)
  }, [filtered, safePage, safePageSize])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Solicitud Pedido</h3>
            <p className="text-xs text-slate-500">
              Pedido = (Consumo Total × Meses) − (Inventario 772 + Inventario 771). Consumo Total = Promedio + Desv.
              Est.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefreshConsumptions?.()
                onRefreshInventories?.()
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              Sincronizar
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Meses a pedir</label>
            <input
              type="number"
              min={0}
              step={1}
              value={monthsToRequest}
              onChange={(e) => {
                setMonthsToRequest(Number(e.target.value) || 0)
                setPage(1)
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtros</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHideZeroOrder((v) => !v)
                  setPage(1)
                }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
              >
                {hideZeroOrder ? 'Mostrar pedido 0' : 'Ocultar pedido 0'}
              </button>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por código o medicamento..."
                className="flex-1 min-w-72 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatusBanner status={inventoryStatus} />
          <StatusBanner status={monthlyStatus} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Cálculo por medicamento</h3>
              <p className="text-xs text-slate-500">
                Meses usados: {monthLabels.length ? monthLabels.slice().reverse().join(', ') : 'Sin datos'}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500">{totalItems} filas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 text-[10px] uppercase font-bold shadow-sm">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap w-36 text-center">Código</th>
                <th className="px-4 py-4 whitespace-nowrap text-center">Medicamento</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[2] ?? 'Mes 3'}</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[1] ?? 'Mes 2'}</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[0] ?? 'Mes 1'}</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Promedio</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Desv. Est.</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-32">Consumo Total</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Inv. 772</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Inv. 771</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Inv. Total</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Meses</th>
                <th className="px-3 py-4 text-center whitespace-nowrap w-28">Pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((r, idx) => (
                <tr key={`${r.siges_code || r.medication_name}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-xs text-slate-600 font-mono whitespace-nowrap text-center">
                    {r.siges_code || ''}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-700 whitespace-normal break-words">
                    {r.medication_name}
                  </td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[2] ?? 0)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[1] ?? 0)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[0] ?? 0)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.avg)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.sd)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.consumoTotal)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.inv772)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.inv771)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.invTotal)}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{monthsToRequest}</td>
                  <td className="px-3 py-4 text-center font-mono text-sm font-bold text-blue-700 tabular-nums">
                    {formatNumber(r.pedido)}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-10 text-center text-sm text-slate-400">
                    No hay resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-slate-500">
            {totalItems === 0 ? '0 resultados' : `Mostrando ${start}-${end} de ${totalItems}`}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">Filas</label>
            <select
              value={safePageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 50)
                setPage(1)
              }}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
            >
              {[25, 50, 100, 200].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-600">
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
