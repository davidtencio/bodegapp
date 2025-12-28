import { AlertTriangle, ArrowRightLeft, X } from 'lucide-react'

export default function ConsumeModal({ medications, consumeError, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900">Registrar Salida / Consumo</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Seleccionar Medicamento
            </label>
            <select
              name="medication_id"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-sm"
            >
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (Disp: {m.stock})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cantidad</label>
              <input
                type="number"
                name="quantity"
                defaultValue={1}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Responsable
              </label>
              <input
                name="user"
                required
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Nombre..."
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Motivo / Destino
            </label>
            <textarea
              name="reason"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
              placeholder="Ej. Paciente Juan Pérez, Hab. 204..."
            />
          </div>
          {consumeError && (
            <div className="p-3 rounded-lg text-xs flex items-center space-x-2 bg-red-50 text-red-700 border border-red-100">
              <AlertTriangle size={16} />
              <span>{consumeError}</span>
            </div>
          )}
          <div className="pt-2 flex space-x-3">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center space-x-2"
            >
              <ArrowRightLeft size={18} />
              <span>Procesar Salida</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

