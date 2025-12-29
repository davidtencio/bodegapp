import { Plus } from 'lucide-react'

export default function PageHeader({ activeTab, onNewMedication }) {
  const title =
    activeTab === 'dashboard'
      ? 'Resumen General'
      : activeTab === 'inventory'
        ? 'Gestión de Inventario'
        : activeTab === 'catalog'
          ? 'Catálogo de Productos'
          : activeTab === 'consumption-monthly'
            ? 'Consumo Mensual'
            : activeTab === 'consumption-summary'
              ? 'Resumen de Consumo'
              : 'Alertas de Stock'

  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 capitalize">{title}</h2>
        <p className="text-slate-500">Sistema central de suministros médicos.</p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onNewMedication}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          <span>Nuevo Medicamento</span>
        </button>
      </div>
    </header>
  )
}
