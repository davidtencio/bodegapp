import { Download, Plus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

const formatNumber = (value) => {
  const asNumber = Number(value)
  if (Number.isFinite(asNumber)) return asNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return '0.00'
}

const escapeHtml = (unsafe) =>
  String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export default function InventoryTakeView({ medications }) {
  const [medQuery, setMedQuery] = useState('')
  const [physicalRaw, setPhysicalRaw] = useState('')
  const [formError, setFormError] = useState('')
  const physicalRef = useRef(null)
  const medRef = useRef(null)

  const [entries, setEntries] = useState([])
  const [pendingMismatch, setPendingMismatch] = useState(null)

  const medIndex = useMemo(() => {
    const byKey = new Map()
    for (const m of medications ?? []) {
      const code = String(m?.siges_code || '').trim()
      const name = String(m?.name || '').trim()
      const key = code ? `code:${code.toLowerCase()}` : name ? `name:${name.toLowerCase()}` : ''
      if (!key) continue
      const existing = byKey.get(key)
      if (existing) {
        existing.registered += Number(m?.stock) || 0
      } else {
        byKey.set(key, {
          key,
          code,
          name,
          registered: Number(m?.stock) || 0,
        })
      }
    }

    const list = Array.from(byKey.values())
    list.sort((a, b) => {
      const aCode = String(a.code || '')
      const bCode = String(b.code || '')
      const codeCmp = aCode.localeCompare(bCode, 'es', { numeric: true, sensitivity: 'base' })
      if (codeCmp !== 0) return codeCmp
      return String(a.name || '').localeCompare(String(b.name || ''), 'es', { numeric: true, sensitivity: 'base' })
    })
    return list
  }, [medications])

  const findMedication = (query) => {
    const raw = String(query || '').trim()
    if (!raw) return null

    const candidate = medIndex.find((m) => {
      if (!m) return false
      const label = `${m.code ? `${m.code} - ` : ''}${m.name}`.trim()
      return label.toLowerCase() === raw.toLowerCase()
    })
    if (candidate) return candidate

    const codeMatch = raw.match(/^([0-9]{3}-[0-9]{2}-[0-9]{4}|[A-Za-z0-9\\-_.]+)\s*-\s*(.+)$/)
    if (codeMatch) {
      const code = String(codeMatch[1] || '').trim().toLowerCase()
      const byCode = medIndex.find((m) => String(m?.code || '').trim().toLowerCase() === code)
      if (byCode) return byCode
    }

    const exactName = medIndex.find((m) => String(m?.name || '').trim().toLowerCase() === raw.toLowerCase())
    if (exactName) return exactName

    return null
  }

  const resetForm = () => {
    setMedQuery('')
    setPhysicalRaw('')
    setFormError('')
    window.setTimeout(() => medRef.current?.focus(), 0)
  }

  const buildEntry = ({ med, physical }) => {
    const registered = Number(med?.registered) || 0
    const physicalNum = Number(physical) || 0
    const diff = physicalNum - registered
    return {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      created_at: new Date().toISOString(),
      key: med?.key || '',
      siges_code: med?.code || '',
      name: med?.name || '',
      registered,
      physical: physicalNum,
      diff,
    }
  }

  const submit = (e) => {
    e?.preventDefault?.()
    setFormError('')

    const med = findMedication(medQuery)
    if (!med) {
      setFormError('Selecciona un medicamento válido.')
      window.setTimeout(() => medRef.current?.focus(), 0)
      return
    }

    const physical = Number.parseFloat(String(physicalRaw || '').replace(',', '.'))
    if (!Number.isFinite(physical)) {
      setFormError('Ingresa un inventario físico válido.')
      window.setTimeout(() => physicalRef.current?.focus(), 0)
      return
    }

    const nextEntry = buildEntry({ med, physical })
    const isMismatch = Math.abs(Number(nextEntry.diff) || 0) > 1e-9
    if (isMismatch) {
      setPendingMismatch(nextEntry)
      return
    }

    setEntries((prev) => [nextEntry, ...prev])
    resetForm()
  }

  const exportToPdf = () => {
    const printedAt = new Date().toLocaleString()
    const title = 'Toma de Inventario'
    const rowsHtml = (entries ?? [])
      .slice()
      .reverse()
      .map((row, idx) => {
        return `
          <tr>
            <td class="center mono">${escapeHtml(String(idx + 1))}</td>
            <td class="mono">${escapeHtml(row?.siges_code || '')}</td>
            <td>${escapeHtml(row?.name || '')}</td>
            <td class="center mono">${escapeHtml(formatNumber(row?.registered))}</td>
            <td class="center mono">${escapeHtml(formatNumber(row?.physical))}</td>
            <td class="center mono ${Number(row?.diff) === 0 ? '' : 'diff'}">${escapeHtml(formatNumber(row?.diff))}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
            .center { text-align: center; white-space: nowrap; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
            .diff { color: #b91c1c; font-weight: 700; }
            @page { size: A4 portrait; margin: 12mm; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">Generado: ${escapeHtml(printedAt)} · Registros: ${escapeHtml(String((entries ?? []).length))}</div>
          <table>
            <thead>
              <tr>
                <th class="center">#</th>
                <th class="center">Código SIGES</th>
                <th>Medicamento</th>
                <th class="center">Registrado</th>
                <th class="center">Físico</th>
                <th class="center">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6">Sin registros.</td></tr>'}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        window.setTimeout(() => iframe.remove(), 1000)
      }
    }
    iframe.srcdoc = html
    document.body.appendChild(iframe)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Toma de Inventario</h3>
            <p className="text-xs text-slate-500">Registra el conteo físico y compáralo con el inventario registrado.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportToPdf}
              disabled={(entries ?? []).length === 0}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
              title="Exportar a PDF (imprimir)"
            >
              <Download size={14} />
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => setEntries([])}
              disabled={(entries ?? []).length === 0}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
              title="Limpiar la toma actual"
            >
              <X size={14} />
              Limpiar
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Medicamento</label>
            <input
              ref={medRef}
              type="text"
              list="inventoryTakeMedications"
              value={medQuery}
              onChange={(e) => setMedQuery(e.target.value)}
              placeholder="Escribe y selecciona el medicamento..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <datalist id="inventoryTakeMedications">
              {medIndex.slice(0, 500).map((m) => (
                <option key={m.key} value={`${m.code ? `${m.code} - ` : ''}${m.name}`} />
              ))}
            </datalist>
            <p className="mt-1 text-[11px] text-slate-400">Tip: escribe el nombre o el código SIGES.</p>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Inventario físico</label>
            <input
              ref={physicalRef}
              inputMode="decimal"
              type="text"
              value={physicalRaw}
              onChange={(e) => setPhysicalRaw(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-2 flex md:items-end">
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Registrar
            </button>
          </div>

          {formError && <div className="md:col-span-12 text-xs text-red-600 font-bold">{formError}</div>}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h4 className="font-bold text-slate-700 text-sm">Registros</h4>
          <span className="text-xs text-slate-500">{entries.length} total</span>
        </div>

        {entries.length === 0 ? (
          <div className="p-6 text-sm text-slate-400 italic">Aún no hay registros en esta toma.</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {entries.map((row) => (
                <div key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-500">{row.siges_code || '—'}</div>
                      <div className="font-semibold text-slate-800 text-sm truncate">{row.name}</div>
                    </div>
                    <div className={`text-xs font-bold ${Number(row.diff) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatNumber(row.diff)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Registrado</div>
                      <div className="font-mono">{formatNumber(row.registered)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Físico</div>
                      <div className="font-mono">{formatNumber(row.physical)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Diferencia</div>
                      <div className="font-mono">{formatNumber(row.diff)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-max w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Código SIGES</th>
                    <th className="px-6 py-4 whitespace-nowrap">Medicamento</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Registrado</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Físico</th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {entries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-700 font-mono text-center whitespace-nowrap">{row.siges_code || ''}</td>
                      <td className="px-6 py-4 text-slate-700">
                        <span className="block truncate max-w-[680px]">{row.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-slate-700 font-mono">{formatNumber(row.registered)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-slate-700 font-mono">{formatNumber(row.physical)}</td>
                      <td
                        className={`px-6 py-4 text-center whitespace-nowrap font-mono ${
                          Number(row.diff) === 0 ? 'text-green-700' : 'text-red-700 font-bold'
                        }`}
                      >
                        {formatNumber(row.diff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pendingMismatch && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800">Diferencia detectada</h4>
              <p className="text-xs text-slate-500 mt-1">Revisa los valores antes de registrar.</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs font-mono text-slate-500">{pendingMismatch.siges_code || '—'}</div>
              <div className="font-semibold text-slate-800">{pendingMismatch.name}</div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Registrado</div>
                  <div className="font-mono font-bold text-slate-800">{formatNumber(pendingMismatch.registered)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Físico</div>
                  <div className="font-mono font-bold text-slate-800">{formatNumber(pendingMismatch.physical)}</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-red-400">Diferencia</div>
                  <div className="font-mono font-bold text-red-700">{formatNumber(pendingMismatch.diff)}</div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingMismatch(null)
                  window.setTimeout(() => physicalRef.current?.focus(), 0)
                }}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Corregir
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntries((prev) => [pendingMismatch, ...prev])
                  setPendingMismatch(null)
                  resetForm()
                }}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

