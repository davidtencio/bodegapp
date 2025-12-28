export default function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }

  return (
    <div className="p-6 rounded-2xl border bg-white shadow-sm flex items-center space-x-4">
      <div className={`p-4 rounded-xl ${colors[color] || colors.blue}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

