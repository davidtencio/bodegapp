import { Calendar, User } from 'lucide-react'

export default function ConsumptionView({ consumptions }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
          <tr>
            <th className="px-6 py-4">Fecha / Hora</th>
            <th className="px-6 py-4">Medicamento</th>
            <th className="px-6 py-4">Cantidad</th>
            <th className="px-6 py-4">Responsable</th>
            <th className="px-6 py-4">Motivo / Destino</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {consumptions.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 text-xs text-slate-500 flex items-center space-x-2 font-mono">
                <Calendar size={12} />
                <span>{c.date}</span>
              </td>
              <td className="px-6 py-4 text-sm font-medium">{c.medication_name}</td>
              <td className="px-6 py-4 text-red-600 font-bold text-sm">-{c.quantity}</td>
              <td className="px-6 py-4 text-xs text-slate-600 flex items-center space-x-2">
                <User size={12} className="text-slate-400" />
                <span>{c.user}</span>
              </td>
              <td className="px-6 py-4 text-xs text-slate-500 italic">"{c.reason}"</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

