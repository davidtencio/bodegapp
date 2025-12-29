import { ClipboardList } from 'lucide-react'

export default function OrderRequestView() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
          <ClipboardList size={18} />
        </div>
        <h3 className="font-bold text-slate-800">Solicitud Pedido</h3>
      </div>
      <p className="mt-2 text-sm text-slate-500">Pantalla en construcciÃ³n.</p>
    </div>
  )
}

