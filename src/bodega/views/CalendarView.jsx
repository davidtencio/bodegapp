import { AlertTriangle, CheckCircle2, RefreshCcw, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function toInputDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const first = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(first) ? first : ''
}

export default function CalendarView({ status, entries, onRefresh, onSave }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [draftByMonth, setDraftByMonth] = useState(() => Array.from({ length: 12 }, () => ''))
  const [isSaving, setIsSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const years = useMemo(() => {
    const set = new Set([currentYear])
    for (const entry of entries ?? []) {
      const y = Number(entry?.year)
      if (Number.isFinite(y) && y > 0) set.add(y)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [currentYear, entries])

  const byYearMonth = useMemo(() => {
    const map = new Map()
    for (const entry of entries ?? []) {
      const y = Number(entry?.year) || 0
      const m = Number(entry?.month) || 0
      if (!y || m < 1 || m > 12) continue
      map.set(`${y}-${m}`, entry)
    }
    return map
  }, [entries])

  useEffect(() => {
    if (!years.includes(year)) setYear(years[0] ?? currentYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years.join(','), year])

  useEffect(() => {
    const next = Array.from({ length: 12 }, (_, idx) => {
      const entry = byYearMonth.get(`${year}-${idx + 1}`)
      return toInputDate(entry?.scheduled_receipt_date)
    })
    setDraftByMonth(next)
    setDirty(false)
  }, [byYearMonth, year])

  const saveAll = async () => {
    if (!onSave || isSaving) return
    setIsSaving(true)
    try {
      const payload = Array.from({ length: 12 }, (_, idx) => ({
        year,
        month: idx + 1,
        scheduled_receipt_date: draftByMonth[idx] ? String(draftByMonth[idx]) : null,
      }))
      await onSave(payload)
      setDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || currentYear)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2"
              title="Sincronizar calendario"
            >
              <RefreshCcw size={14} />
              Sincronizar
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={!dirty || isSaving}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-blue-600"
              title="Guardar cambios"
            >
              <Save size={14} />
              Guardar
            </button>
          </div>
        </div>

        {status?.message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : status.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{status.message}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-6 py-4 whitespace-nowrap">Mes</th>
              <th className="px-6 py-4 whitespace-nowrap">Recepci贸n programada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHS.map((label, idx) => (
              <tr key={label} className="hover:bg-slate-50 transition-colors text-sm">
                <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{label}</td>
                <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                  <input
                    type="date"
                    value={draftByMonth[idx] ?? ''}
                    onChange={(e) => {
                      const nextValue = e.target.value
                      setDraftByMonth((prev) => {
                        const copy = [...prev]
                        copy[idx] = nextValue
                        return copy
                      })
                      setDirty(true)
                    }}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

