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

export default function ConsumptionSummaryView({ months, onRefresh, status }) {
  const lastThree = (months ?? []).slice(0, 3)
  const totals = lastThree.map((m) => (m?.items ?? []).reduce((acc, item) => acc + toNumber(item?.quantity), 0))
  const avg = mean(totals)
  const sd = stdDev(totals)
  const total = avg + sd

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Resumen de consumo</h3>
            <p className="text-xs text-slate-500">Muestra los 3 meses más recientes (según fecha de carga).</p>
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

        {status?.message && (
          <div
            className={`mt-4 border rounded-lg px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : status.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span>{status.message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                <BarChart3 size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Últimos 3 meses</h3>
            </div>
            <span className="text-xs text-slate-500">{lastThree.length} meses</span>
          </div>

          {lastThree.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No hay consumos cargados.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Mes</th>
                  <th className="px-6 py-4 text-right">Consumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lastThree.map((m, idx) => (
                  <tr key={m.id ?? m.label ?? idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{m.label}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 tabular-nums">
                      {formatNumber(totals[idx])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Métricas</h3>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Promedio mensual</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatNumber(avg)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Desviación estándar</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatNumber(sd)}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Consumo total (Prom. + Desv.)</span>
              <span className="font-bold text-blue-700 tabular-nums">{formatNumber(total)}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              El consumo se calcula como la suma de la columna <span className="font-mono">Consumo</span> del CSV por mes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
