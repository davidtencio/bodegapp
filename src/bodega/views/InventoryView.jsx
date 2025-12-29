import { AlertTriangle, CheckCircle2, Download, Edit2, Pill, Search, Trash2, Upload } from 'lucide-react'

export default function InventoryView({
  inventoryType,
  onInventoryTypeChange,
  inventoryStatus,
  fileInputRef,
  onChooseFile,
  onFileChange,
  onDownloadTemplate,
  canClear,
  onClearInventory,
  search,
  onSearchChange,
  items,
  onEditMedication,
  onDeleteMedication,
}) {
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
            <th className="px-6 py-4">Medicamento</th>
            <th className="px-6 py-4">Categoría</th>
            <th className="px-6 py-4">Lote / Venc.</th>
            <th className="px-6 py-4">Stock</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <Pill size={16} />
                  </div>
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{item.category}</td>
              <td className="px-6 py-4">
                <div className="text-xs">
                  <p className="font-mono text-slate-700">{item.batch}</p>
                  <p
                    className={`mt-0.5 ${
                      new Date(item.expiry_date) < new Date()
                        ? 'text-red-500 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.expiry_date}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="font-bold text-slate-800">{item.stock}</span>
                <span className="text-[10px] text-slate-400 ml-1 uppercase">{item.unit}</span>
              </td>
              <td className="px-6 py-4">
                {item.stock <= item.min_stock ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full uppercase">
                    Crítico
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full uppercase">
                    Normal
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditMedication(item)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMedication(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                No hay resultados para “{search}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
