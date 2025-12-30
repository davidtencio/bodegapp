export default function PageHeader({ activeTab }) {
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
              : activeTab === 'order-request'
                ? 'Solicitud Pedido'
                : 'Alertas de Stock'

  return (
    <header className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 capitalize">{title}</h2>
        <p className="text-slate-500">Sistema central de suministros médicos.</p>
      </div>
    </header>
  )
}
