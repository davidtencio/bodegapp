import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  Menu,
  Package,
  Pill,
  Tag,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'bodegapp.sidebar.openSections'

function SidebarItem({ id, icon: Icon, label, activeTab, isSidebarOpen, onSelect }) {
  return (
    <button
      type="button"
      title={!isSidebarOpen ? label : undefined}
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

function SidebarSectionHeader({ label, open, isSidebarOpen, onToggle }) {
  if (!isSidebarOpen) return <div className="h-px bg-slate-100 my-2" />

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between hover:text-slate-500"
    >
      <span>{label}</span>
      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
    </button>
  )
}

export default function Sidebar({ activeTab, isSidebarOpen, onSelectTab, onToggleSidebar }) {
  const sections = useMemo(
    () => [
      {
        id: 'inventories',
        label: 'Gestión de inventarios',
        items: [
          { id: 'inventory', icon: Pill, label: 'Inventario' },
          { id: 'catalog', icon: FileSpreadsheet, label: 'Catálogo' },
          { id: 'categories', icon: Tag, label: 'Categorías' },
        ],
      },
      {
        id: 'consumption',
        label: 'Consumos y análisis',
        items: [
          { id: 'consumption-monthly', icon: Upload, label: 'Consumo mensual' },
          { id: 'consumption-summary', icon: BarChart3, label: 'Resumen de consumo' },
        ],
      },
      {
        id: 'supply',
        label: 'Abastecimiento',
        items: [
          { id: 'order-request', icon: ClipboardList, label: 'Solicitud de pedido' },
          { id: 'tertiary-packaging', icon: Package, label: 'Empaque terciario' },
        ],
      },
      {
        id: 'planning',
        label: 'Planificación',
        items: [{ id: 'calendar', icon: CalendarDays, label: 'Calendario' }],
      },
    ],
    [],
  )

  const sectionByTab = useMemo(() => {
    const map = new Map()
    for (const section of sections) {
      for (const item of section.items) map.set(item.id, section.id)
    }
    return map
  }, [sections])

  const [openSections, setOpenSections] = useState(() => {
    const defaults = { inventories: true, consumption: true, supply: true, planning: true }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return defaults
      return {
        inventories: Boolean(parsed.inventories ?? true),
        consumption: Boolean(parsed.consumption ?? true),
        supply: Boolean(parsed.supply ?? true),
        planning: Boolean(parsed.planning ?? true),
      }
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections))
    } catch {
      // ignore
    }
  }, [openSections])

  useEffect(() => {
    const sectionId = sectionByTab.get(activeTab)
    if (!sectionId) return
    setOpenSections((prev) => (prev[sectionId] ? prev : { ...prev, [sectionId]: true }))
  }, [activeTab, sectionByTab])

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
        {sections.map((section) => {
          const isOpen = Boolean(openSections?.[section.id] ?? true)
          const canShowItems = !isSidebarOpen || isOpen
          return (
            <div key={section.id} className="space-y-2">
              <SidebarSectionHeader
                label={section.label}
                open={isOpen}
                isSidebarOpen={isSidebarOpen}
                onToggle={() => setOpenSections((prev) => ({ ...prev, [section.id]: !isOpen }))}
              />
              {canShowItems && (
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      label={item.label}
                      activeTab={activeTab}
                      isSidebarOpen={isSidebarOpen}
                      onSelect={onSelectTab}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 w-full flex justify-center"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </aside>
  )
}
