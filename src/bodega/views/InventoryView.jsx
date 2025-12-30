import { AlertTriangle, CheckCircle2, Download, RefreshCcw, Search, Trash2, Upload } from 'lucide-react'

export default function InventoryView({
  inventoryType,
  onInventoryTypeChange,
  inventoryStatus,
  fileInputRef,
  onChooseFile,
  onFileChange,
  onDownloadTemplate,
  onRefresh,
  canClear,
  onClearInventory,
  search,
  onSearchChange,
  items,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const is771 = String(inventoryType || '772') === '771'

  const formatInventoryValue = (value) => {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber.toLocaleString('en-US', { maximumFractionDigits: 2 })
    return String(value ?? '0')
  }

  const formatDateEs = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return 'S/N'

    const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0')
      const mm = String(parsed.getMonth() + 1).padStart(2, '0')
      const yyyy = String(parsed.getFullYear())
      return `${dd}/${mm}/${yyyy}`
    }

    return raw
  }

  const formatLotLine = (lot) => {
    if (!lot) return ''
    const batch = String(lot.batch || '').trim() || 'S/N'
    const expiry = formatDateEs(lot.expiry_date)
    const qty = formatInventoryValue(lot.stock)
    return `${batch} (${expiry}): ${qty}`
  }

  const total = Number(totalItems) || 0
  const size = Number(pageSize) || 50
  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const start = total === 0 ? 0 : (currentPage - 1) * size + 1
  const end = Math.min(currentPage * size, total)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            {['772', '771'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onInventoryTypeChange?.(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  String(inventoryType || '772') === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                Inventario {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept={is771 ? '.xml' : '.csv'}
              className="hidden"
            />
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2"
              title="Sincronizar inventarios"
            >
              <RefreshCcw size={14} />
              Sincronizar
            </button>
            <button
              type="button"
              onClick={onChooseFile}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <Upload size={14} />
              {is771 ? 'Cargar XML' : 'Cargar CSV'}
            </button>
            <button
              type="button"
              onClick={() => onDownloadTemplate?.(inventoryType)}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2"
            >
              <Download size={14} />
              Plantilla
            </button>
            <button
              type="button"
              onClick={() => onClearInventory?.(inventoryType)}
              disabled={!canClear}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
              title="Eliminar toda la carga de este inventario"
            >
              <Trash2 size={14} />
              Eliminar carga
            </button>
          </div>
        </div>

        {inventoryStatus?.message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              inventoryStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : inventoryStatus.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
          >
            {inventoryStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{inventoryStatus.message}</span>
          </div>
        )}

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar medicamento..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-6 py-4 text-center whitespace-nowrap">Código SIGES</th>
              <th className="px-6 py-4 whitespace-nowrap">Medicamento</th>
              {is771 && <th className="px-6 py-4 whitespace-nowrap">Lotes (venc. / cant.)</th>}
              <th className="px-6 py-4 text-center whitespace-nowrap">{is771 ? 'Inventario total' : 'Inventario'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group text-sm">
                <td className="px-6 py-4 text-slate-700 font-mono text-center whitespace-nowrap">
                  {item.siges_code || ''}
                </td>
                <td className="px-6 py-4 max-w-[620px] text-slate-700">
                  <span className="block truncate font-medium">{item.name}</span>
                </td>
                {is771 && (
                  <td className="px-6 py-4 text-slate-600 font-mono">
                    <div className="flex flex-col gap-1">
                      {Array.isArray(item.lots) && item.lots.length > 0 ? (
                        item.lots.map((lot) => (
                          <div key={lot.id || `${lot.batch}-${lot.expiry_date}`} className="whitespace-nowrap">
                            {formatLotLine(lot)}
                          </div>
                        ))
                      ) : (
                        <div className="whitespace-nowrap">{formatLotLine(item)}</div>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 text-center whitespace-nowrap text-slate-800">
                  <span className="font-bold">{formatInventoryValue(item.stock)}</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={is771 ? 4 : 3} className="px-6 py-10 text-center text-sm text-slate-400">
                  No hay resultados para &quot;{search}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-slate-500">{total === 0 ? '0 resultados' : `Mostrando ${start}-${end} de ${total}`}</div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">Filas</label>
          <select
            value={size}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value) || 50)}
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
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">Página {currentPage} de {totalPages}</span>
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
