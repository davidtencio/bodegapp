import { FileDown, Upload } from 'lucide-react'

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

export default function MonthlyConsumptionView({
  months,
  selectedMonthId,
  onSelectMonth,
  monthlyStatus,
  fileInputRef,
  onChooseFile,
  onFileChange,
  onDownloadTemplate,
}) {
  const selected = months.find((m) => m.id === selectedMonthId) || null

  const formatQuantity = (value) => {
    const asNumber = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(asNumber)) return '—'
    return new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(asNumber)
  }

  const formatCost = (value) => {
    const asNumber = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(asNumber)) return '—'
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(asNumber)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Importar consumo mensual</h3>
            <p className="text-xs text-slate-500">
              Recomendado: nombre del archivo <span className="font-mono">Enero 2025.csv</span> (se usa como nombre del
              mes).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".csv" className="hidden" />
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-2"
            >
              <FileDown size={16} />
              Descargar plantilla
            </button>
            <button
              type="button"
              onClick={onChooseFile}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
            >
              <Upload size={16} />
              Importar CSV
            </button>
          </div>
        </div>

        <div className="mt-4">
          <StatusBanner status={monthlyStatus} />
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <label className="text-xs font-semibold text-slate-600">Mes cargado</label>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={selectedMonthId ?? ''}
            onChange={(e) => onSelectMonth(e.target.value || null)}
          >
            <option value="">Seleccione un mes...</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-semibold text-slate-800">{selected ? `Detalle: ${selected.label}` : 'Detalle del mes'}</h4>
          {selected && <span className="text-xs text-slate-500">{selected.items.length} registros</span>}
        </div>

        {!selected ? (
          <div className="p-8 text-center text-slate-500 text-sm">Importa un CSV y selecciona un mes para ver el detalle.</div>
        ) : selected.items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No hay consumos en este mes.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-32 text-center">Código SIGES</th>
                <th className="px-6 py-4">Medicamento</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Consumo</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selected.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono whitespace-nowrap w-32 text-center">
                    {c.siges_code || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{c.medication_name}</td>
                  <td className="px-6 py-4 text-center text-slate-800 font-semibold text-sm tabular-nums">
                    {formatQuantity(c.quantity)}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-700 text-sm font-mono tabular-nums">
                    {formatCost(c.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
