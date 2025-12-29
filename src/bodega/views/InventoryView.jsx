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
}) {
  const formatInventoryValue = (value) => {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) {
      return asNumber.toLocaleString('en-US', { maximumFractionDigits: 2 })
    }
    return String(value ?? '0')
  }

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
              accept=".csv"
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
              Cargar CSV
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
            {inventoryStatus.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
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
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
          <tr>
            <th className="px-6 py-4 text-center">Código SIGES</th>
            <th className="px-6 py-4">Medicamento</th>
            <th className="px-6 py-4 text-center">Inventario</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4 text-sm text-slate-700 font-mono text-center">{item.siges_code || ''}</td>
              <td className="px-6 py-4">
                <span className="font-medium text-slate-700">{item.name}</span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="font-bold text-slate-800">{formatInventoryValue(item.stock)}</span>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                No hay resultados para “{search}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
