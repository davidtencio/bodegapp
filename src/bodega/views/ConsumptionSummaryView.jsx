import React, { useMemo, useState } from 'react'

import { BarChart3, RefreshCcw } from 'lucide-react'

function toNumber(value) {
  const asNumber = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''))
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

export default function ConsumptionSummaryView({ months, onRefresh, status }) {
  const lastThree = (months ?? []).slice(0, 3) // newest -> older (según fecha de carga)
  const monthLabels = lastThree.map((m) => String(m?.label ?? '').trim()).filter(Boolean)

  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    const map = new Map()

    lastThree.forEach((m, monthIndex) => {
      const items = m?.items ?? []
      for (const item of items) {
        const siges_code = String(item?.siges_code ?? '').trim()
        const medication_name = String(item?.medication_name ?? '').trim()
        const key = buildMedicationKey({ siges_code, medication_name })
        if (!key) continue

        const current = map.get(key) ?? {
          siges_code,
          medication_name,
          perMonth: [0, 0, 0],
        }

        current.siges_code = current.siges_code || siges_code
        current.medication_name = current.medication_name || medication_name
        current.perMonth[monthIndex] += toNumber(item?.quantity)
        map.set(key, current)
      }
    })

    return Array.from(map.values()).map((m) => {
      const values = m.perMonth.slice(0, 3)
      const avg = mean(values)
      const sd = stdDev(values)
      return {
        ...m,
        avg,
        sd,
        total: avg + sd,
      }
    })
  }, [lastThree])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? rows.filter((r) => {
          const haystack = `${r.siges_code} ${r.medication_name}`.toLowerCase()
          return haystack.includes(q)
        })
      : rows

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
  }, [rows, search])

  const totalItems = filtered.length
  const safePageSize = Math.max(1, Number(pageSize) || 50)
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)

  const paginated = useMemo(() => {
    const startIndex = (safePage - 1) * safePageSize
    return filtered.slice(startIndex, startIndex + safePageSize)
  }, [filtered, safePage, safePageSize])

  const start = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1
  const end = Math.min(safePage * safePageSize, totalItems)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Resumen de consumo</h3>
            <p className="text-xs text-slate-500">
              Muestra por medicamento: código, consumos de los últimos 3 meses, promedio, desviación estándar y total
              (promedio + desviación).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              Sincronizar
            </button>
          </div>
        </div>

        <div className="mt-4">
          <StatusBanner status={status} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <BarChart3 size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Consumo por medicamento (últimos 3 meses)</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por código o medicamento..."
              className="w-72 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>

        {lastThree.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No hay consumos cargados.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-4 py-4 whitespace-nowrap w-36 text-center">Código SIGES</th>
                    <th className="px-4 py-4 whitespace-nowrap text-center">Medicamento</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[2] ?? 'Mes 3'}</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[1] ?? 'Mes 2'}</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-32">{monthLabels[0] ?? 'Mes 1'}</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-28">Promedio</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-28">Desv. Est.</th>
                    <th className="px-3 py-4 text-center whitespace-nowrap w-36">Total (Prom.+Desv.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((r, idx) => (
                    <tr key={`${r.siges_code || r.medication_name}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-xs text-slate-600 font-mono whitespace-nowrap text-center">{r.siges_code || ''}</td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-700 whitespace-normal break-words">
                        {r.medication_name}
                      </td>
                      <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[2] ?? 0)}</td>
                      <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[1] ?? 0)}</td>
                      <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.perMonth[0] ?? 0)}</td>
                      <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.avg)}</td>
                      <td className="px-3 py-4 text-center font-mono text-sm tabular-nums">{formatNumber(r.sd)}</td>
                      <td className="px-3 py-4 text-center font-mono text-sm font-bold text-blue-700 tabular-nums">{formatNumber(r.total)}</td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
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
          </>
        )}
      </div>
    </div>
  )
}
