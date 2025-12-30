import { AlertTriangle, CheckCircle2, Download, Pencil, RefreshCcw, Search, Trash2, Upload, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function TertiaryPackagingView({
  status,
  fileInputRef,
  onChooseFile,
  onFileChange,
  onDownloadTemplate,
  onRefresh,
  canClear,
  onClear,
  onEdit,
  search,
  onSearchChange,
  items,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const [editing, setEditing] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingQuantity, setEditingQuantity] = useState('')

  const formatNumber = (value) => {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return String(value ?? '0')
  }

  const canEdit = Boolean(onEdit)
  const showActions = useMemo(() => canEdit, [canEdit])

  const openEdit = (item) => {
    if (!item) return
    setEditing(item)
    setEditingName(String(item.medication_name || '').trim())
    setEditingQuantity(String(item.tertiary_quantity ?? '').trim())
  }

  const closeEdit = () => {
    setEditing(null)
    setEditingName('')
    setEditingQuantity('')
  }

  const onSubmitEdit = async () => {
    if (!editing) return
    const asNumber = Number(String(editingQuantity ?? '').trim().replace(/\s/g, '').replace(/,/g, ''))
    await onEdit?.({
      ...editing,
      medication_name: editingName,
      tertiary_quantity: Number.isFinite(asNumber) ? asNumber : 0,
    })
    closeEdit()
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
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar por código o medicamento..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".xlsx" className="hidden" />
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2"
              title="Sincronizar empaque terciario"
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
              Cargar XLSX
            </button>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2"
            >
              <Download size={14} />
              Plantilla
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={!canClear}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
              title="Eliminar toda la carga"
            >
              <Trash2 size={14} />
              Eliminar carga
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
              <th className="px-6 py-4 text-center whitespace-nowrap">Código SIGES</th>
              <th className="px-6 py-4 whitespace-nowrap">Medicamento</th>
              <th className="px-6 py-4 text-center whitespace-nowrap">Empaque terciario</th>
              {showActions && <th className="px-6 py-4 text-center whitespace-nowrap">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group text-sm">
                <td className="px-6 py-4 text-slate-700 font-mono text-center whitespace-nowrap">{item.siges_code}</td>
                <td className="px-6 py-4 text-slate-700 max-w-[520px]">
                  <span className="block truncate">{item.medication_name}</span>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap text-slate-800 font-mono">
                  {formatNumber(item.tertiary_quantity)}
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={showActions ? 4 : 3} className="px-6 py-10 text-center text-sm text-slate-400">
                  No hay resultados para &quot;{search}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800">Editar empaque terciario</div>
                <div className="text-xs text-slate-500 font-mono">{editing.siges_code}</div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Medicamento</label>
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Nombre del medicamento"
              />

              <label className="block text-[10px] font-bold text-slate-500 uppercase">Empaque terciario</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editingQuantity}
                onChange={(e) => setEditingQuantity(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSubmitEdit}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
