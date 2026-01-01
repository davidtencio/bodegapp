import {
  BarChart3,
  FileSpreadsheet,
  Tag,
  Menu,
  Package,
  Pill,
  ClipboardList,
  CalendarDays,
  Upload,
  X,
} from 'lucide-react'

function SidebarItem({ id, icon: Icon, label, activeTab, isSidebarOpen, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
        activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'
      }`}
    >
      <Icon size={20} />
      {isSidebarOpen && <span className="font-medium">{label}</span>}
    </button>
  )
}

function SidebarSection({ label, isSidebarOpen }) {
  if (!label) return null
  if (!isSidebarOpen) return <div className="h-px bg-slate-100 my-2" />
  return (
    <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </div>
  )
}

export default function Sidebar({ activeTab, isSidebarOpen, onSelectTab, onToggleSidebar }) {
  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Package size={24} />
        </div>
        {isSidebarOpen && (
          <h1 className="text-xl font-bold tracking-tight text-blue-900 leading-none">
            BODEGA
            <br />
            <span className="text-sm font-normal text-slate-500 tracking-normal">PharmaStock v1.1</span>
          </h1>
        )}
      </div>

      <nav className="flex-1 p-4 mt-4 space-y-2">
        <SidebarSection label="Gestión de inventarios" isSidebarOpen={isSidebarOpen} />
        <SidebarItem id="inventory" icon={Pill} label="Inventario" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />
        <SidebarItem id="catalog" icon={FileSpreadsheet} label="Catálogo" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />
        <SidebarItem id="categories" icon={Tag} label="Categorías" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />

        <SidebarSection label="Consumos y análisis" isSidebarOpen={isSidebarOpen} />
        <SidebarItem id="consumption-monthly" icon={Upload} label="Consumo mensual" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />
        <SidebarItem id="consumption-summary" icon={BarChart3} label="Resumen de consumo" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />

        <SidebarSection label="Abastecimiento" isSidebarOpen={isSidebarOpen} />
        <SidebarItem id="order-request" icon={ClipboardList} label="Solicitud de pedido" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />
        <SidebarItem id="tertiary-packaging" icon={Package} label="Empaque terciario" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />

        <SidebarSection label="Planificación" isSidebarOpen={isSidebarOpen} />
        <SidebarItem id="calendar" icon={CalendarDays} label="Calendario" activeTab={activeTab} isSidebarOpen={isSidebarOpen} onSelect={onSelectTab} />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 w-full flex justify-center"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </aside>
  )
}
