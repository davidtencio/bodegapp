import { AlertTriangle, ChevronRight, ClipboardList, Download, Package, Pill, TrendingDown } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'

export default function DashboardView({
  stats,
  consumptions,
  lowStockItems,
  onViewAllConsumptions,
  onEditMedication,
}) {
  const formatNumber = (value) => {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return String(value ?? '0')
  }

  const escapeHtml = (unsafe) =>
    String(unsafe ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const exportLowStockToPdf = () => {
    const printedAt = new Date().toLocaleString()
    const title = 'Medicamentos Agotándose'

    const rowsHtml = (lowStockItems ?? [])
      .map((item) => {
        const min = formatNumber(item?.computed_min_stock ?? item?.min_stock)
        const stock = formatNumber(item?.stock)
        const days = item?._daysToReceipt != null ? String(item._daysToReceipt) : ''
        return `
          <tr>
            <td class="center mono">${escapeHtml(item?.siges_code || '')}</td>
            <td>${escapeHtml(item?.name || '')}</td>
            <td class="center mono">${escapeHtml(min)}</td>
            <td class="center mono">${escapeHtml(stock)}</td>
            <td class="center mono">${escapeHtml(days)}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
            .center { text-align: center; white-space: nowrap; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
            @page { size: A4 landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">Generado: ${escapeHtml(printedAt)} · Filas: ${escapeHtml((lowStockItems ?? []).length)}</div>
          <table>
            <thead>
              <tr>
                <th class="center">Código SIGES</th>
                <th>Medicamento</th>
                <th class="center">Mínimo</th>
                <th class="center">Actual</th>
                <th class="center">Días a recepción</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5">Sin resultados.</td></tr>'}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        window.setTimeout(() => iframe.remove(), 1000)
      }
    }
    iframe.srcdoc = html
    document.body.appendChild(iframe)
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Medicamentos" value={stats.totalItems} icon={Pill} color="blue" />
        <StatCard title="Stock Crítico" value={stats.lowStockCount} icon={AlertTriangle} color="red" />
        <StatCard title="Total Unidades" value={stats.totalStockValue} icon={Package} color="green" />
        <StatCard title="Consumos Recientes" value={stats.recentConsumptions} icon={ClipboardList} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">Últimos Consumos</h3>
            <button
              type="button"
              onClick={onViewAllConsumptions}
              className="text-blue-600 text-sm flex items-center hover:underline"
            >
              Ver todo <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {consumptions.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-white p-2 rounded-md shadow-sm border border-slate-100 text-slate-400">
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{c.medication_name}</p>
                    <p className="text-xs text-slate-500">{c.siges_code || c.date || ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{c.quantity}</p>
                  <p className="text-xs text-slate-500 font-mono">{c.cost ?? c.user ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">Medicamentos Agotándose</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportLowStockToPdf}
                className="text-slate-600 text-xs font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-2"
                title="Exportar a PDF (imprimir)"
              >
                <Download size={14} />
                Exportar PDF
              </button>
              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
                {lowStockItems.length} Alertas
              </span>
            </div>
          </div>
          <div className="space-y-4">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border-l-4 border-red-500 bg-red-50 rounded-r-lg"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Mínimo: {formatNumber(item.computed_min_stock ?? item.min_stock)} | Actual: {formatNumber(item.stock)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditMedication(item)}
                    className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-100 transition-colors"
                  >
                    Reponer
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm italic">No hay alertas activas de inventario.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
