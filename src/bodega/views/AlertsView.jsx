import { AlertTriangle, Package } from 'lucide-react'

export default function AlertsView({ lowStockItems, onEditMedication }) {
  const formatNumber = (value) => {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return String(value ?? '0')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lowStockItems.map((item) => (
        <div
          key={item.id}
          className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
              <div className="bg-red-100 p-2 rounded-full text-red-600">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="space-y-2 mb-6 text-sm text-slate-600">
              <p className="flex justify-between">
                <span>Categoría:</span> <span className="font-semibold">{item.category}</span>
              </p>
              <p className="flex justify-between">
                <span>Stock Mínimo:</span>{' '}
                <span className="font-semibold">{formatNumber(item.computed_min_stock ?? item.min_stock)}</span>
              </p>
              <p className="flex justify-between">
                <span>Stock Actual:</span>{' '}
                <span className="font-bold text-red-600 text-base">{formatNumber(item.stock)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditMedication(item)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Generar Orden de Compra
          </button>
        </div>
      ))}
      {lowStockItems.length === 0 && (
        <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
          <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">¡Todo en Orden!</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            No hay medicamentos que requieran atención inmediata por falta de inventario.
          </p>
        </div>
      )}
    </div>
  )
}
