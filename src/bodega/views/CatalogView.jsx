import { AlertTriangle, CheckCircle2, Download, Edit2, FileSpreadsheet, Slash, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function CatalogView({
  medications,
  excelStatus,
  fileInputRef,
  sicopFileInputRef,
  onChooseFile,
  onChooseSicopFile,
  onDownloadTemplate,
  onFileChange,
  onSicopFileChange,
  onEditMedication,
  onDiscontinueMedication,
  onDeleteMedication,
  onClearCatalog,
}) {
  const formatMedicationName = (name) => {
    const asString = String(name ?? '').trim()
    if (asString.length <= 50) return { display: asString, full: asString }
    return { display: `${asString.slice(0, 50)}…`, full: asString }
  }

  const sortedMedications = useMemo(() => {
    const extractLast4DigitsNumber = (code) => {
      const digits = String(code || '').replace(/\D/g, '')
      if (digits.length < 4) return Number.POSITIVE_INFINITY
      return Number.parseInt(digits.slice(-4), 10)
    }

    const startsWith110 = (code) => String(code || '').trim().startsWith('1-10')

    return [...(medications || [])].sort((a, b) => {
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
  }, [medications])

  const sicopStats = useMemo(() => {
    const items = medications ?? []
    const withClassifier = items.filter((m) => String(m?.sicop_classifier || '').trim()).length
    const withIdentifier = items.filter((m) => String(m?.sicop_identifier || '').trim()).length
    return { total: items.length, withClassifier, withIdentifier }
  }, [medications])

  const [showDiscontinued, setShowDiscontinued] = useState(false)
  const visibleMedications = useMemo(() => {
    const base = sortedMedications ?? []
    if (showDiscontinued) return base
    return base.filter((m) => !m?.discontinued_at)
  }, [showDiscontinued, sortedMedications])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 text-green-600 p-2 rounded-lg">
              <Upload size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Importar CSV</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Cargue su catálogo masivamente. El archivo debe contener las columnas: <br />
            <code className="bg-slate-100 px-1 rounded text-blue-600 font-mono text-xs">
              CodigoSIGES, ClasificadorSICOP, IdentificadorSICOP, Medicamento, Categoria, Lote, Vencimiento, Stock,
              StockMinimo, Unidad
            </code>
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept=".csv"
            className="hidden"
          />
          <input
            type="file"
            ref={sicopFileInputRef}
            onChange={onSicopFileChange}
            accept=".csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={onChooseFile}
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl py-10 hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <FileSpreadsheet
              size={40}
              className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors"
            />
            <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">
              Seleccionar archivo CSV
            </span>
            <span className="text-xs text-slate-400 mt-1">Soporta .csv</span>
          </button>

          {excelStatus.message && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs flex items-center space-x-2 ${
                excelStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : excelStatus.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}
            >
              {excelStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{excelStatus.message}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Vista Previa del Catálogo</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 font-bold select-none">
                <input
                  type="checkbox"
                  checked={showDiscontinued}
                  onChange={(e) => setShowDiscontinued(e.target.checked)}
                  className="accent-blue-600"
                />
                Mostrar descontinuados
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!medications?.length) return
                  const ok = window.confirm('¿Desea eliminar todo el catálogo? Esta acción no se puede deshacer.')
                  if (!ok) return
                  onClearCatalog?.()
                }}
                disabled={!medications?.length}
                className="text-xs text-red-600 font-bold flex items-center space-x-1 hover:underline disabled:opacity-40 disabled:hover:no-underline"
              >
                <Trash2 size={14} />
                <span>Eliminar Catálogo</span>
              </button>
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="text-xs text-blue-600 font-bold flex items-center space-x-1 hover:underline"
              >
                <Download size={14} />
                <span>Descargar Plantilla</span>
              </button>
              <button
                type="button"
                onClick={onChooseSicopFile}
                className="text-xs text-slate-600 font-bold flex items-center space-x-1 hover:underline"
                title="Importa/actualiza sólo códigos SICOP por Código SIGES"
              >
                <Upload size={14} />
                <span>Cargar SICOP</span>
              </button>
            </div>
          </div>
          {sicopStats.total > 0 && sicopStats.withClassifier === 0 && sicopStats.withIdentifier === 0 && (
            <div className="mx-4 mt-4 p-3 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-100">
              No se detectaron códigos SICOP en el catálogo. Verifica tu CSV (columnas
              <span className="font-mono"> ClasificadorSICOP</span> /
              <span className="font-mono"> IdentificadorSICOP</span>) o edítalos con el lápiz en una fila.
            </div>
          )}
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm text-slate-500 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-3">Código SIGES</th>
                  <th className="px-6 py-3">Clasificador SICOP</th>
                  <th className="px-6 py-3">Identificador SICOP</th>
                  <th className="px-6 py-3">Medicamento</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMedications.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors group ${item.discontinued_at ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-3 text-sm text-slate-700 font-mono">{item.siges_code || '—'}</td>
                    <td className="px-6 py-3 text-sm text-slate-700 font-mono">{item.sicop_classifier || '—'}</td>
                    <td className="px-6 py-3 text-sm text-slate-700 font-mono">{item.sicop_identifier || '—'}</td>
                    <td
                      className="px-6 py-3 text-sm font-medium text-slate-700"
                      title={formatMedicationName(item.name).full}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{formatMedicationName(item.name).display}</span>
                        {item.discontinued_at && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                            Descontinuado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onEditMedication?.(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDiscontinueMedication?.(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                          aria-label={item.discontinued_at ? 'Reactivar' : 'Descontinuar'}
                          title={item.discontinued_at ? 'Reactivar' : 'Descontinuar'}
                        >
                          <Slash size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMedication?.(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
