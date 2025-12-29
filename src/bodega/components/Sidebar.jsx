import {
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Package,
  Pill,
  ClipboardList,
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

      <nav className="flex-1 p-4 space-y-2 mt-4">
        <SidebarItem
          id="dashboard"
          icon={LayoutDashboard}
          label="Panel de Control"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
        <SidebarItem
          id="inventory"
          icon={Pill}
          label="Inventario"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
        <SidebarItem
          id="catalog"
          icon={FileSpreadsheet}
          label="Catálogo"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />

        <SidebarItem
          id="consumption-monthly"
          icon={Upload}
          label="Consumo mensual"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
        <SidebarItem
          id="consumption-summary"
          icon={BarChart3}
          label="Resumen consumo"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
        <SidebarItem
          id="order-request"
          icon={ClipboardList}
          label="Solicitud Pedido"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
        <SidebarItem
          id="alerts"
          icon={AlertTriangle}
          label="Alertas de Stock"
          activeTab={activeTab}
          isSidebarOpen={isSidebarOpen}
          onSelect={onSelectTab}
        />
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
