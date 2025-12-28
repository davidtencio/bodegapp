import { X } from 'lucide-react'

export default function AddEditMedicationModal({ editingMed, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {editingMed ? 'Editar Medicamento' : 'Nuevo Medicamento'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Nombre Comercial
            </label>
            <input
              required
              name="name"
              defaultValue={editingMed?.name}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
              placeholder="Ej. Amoxicilina 500mg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría</label>
            <select
              name="category"
              defaultValue={editingMed?.category}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              <option>Analgésico</option>
              <option>Antibiótico</option>
              <option>Antiinflamatorio</option>
              <option>Insumo Médico</option>
              <option>Protector Gástrico</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidad</label>
            <input
              name="unit"
              defaultValue={editingMed?.unit || 'Tabletas'}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Cajas, Tabletas..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lote</label>
            <input
              name="batch"
              defaultValue={editingMed?.batch}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
              placeholder="LOT-000"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vencimiento</label>
            <input
              type="date"
              name="expiry_date"
              defaultValue={editingMed?.expiry_date}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Inicial</label>
            <input
              type="number"
              name="stock"
              defaultValue={editingMed?.stock || 0}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Mínimo</label>
            <input
              type="number"
              name="min_stock"
              defaultValue={editingMed?.min_stock || 10}
              className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
            />
          </div>
          <div className="col-span-2 pt-4 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 py-3 rounded-xl hover:bg-slate-50 font-semibold transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all text-sm"
            >
              {editingMed ? 'Guardar Cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

