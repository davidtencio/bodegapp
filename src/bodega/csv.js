function stripBom(text) {
  return text.replace(/^\uFEFF/, '')
}

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length
  const semicolonCount = (headerLine.match(/;/g) || []).length
  if (semicolonCount > commaCount) return ';'
  return ','
}

function parseCsvRows(text) {
  const normalized = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false
  let i = 0

  const headerLine = normalized.split('\n')[0] || ''
  const delimiter = detectDelimiter(headerLine)

  while (i < normalized.length) {
    const char = normalized[i]

    if (inQuotes) {
      if (char === '"') {
        const next = normalized[i + 1]
        if (next === '"') {
          value += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      value += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (char === delimiter) {
      row.push(value)
      value = ''
      i += 1
      continue
    }

    if (char === '\n') {
      row.push(value)
      value = ''
      const isEmptyRow = row.every((cell) => String(cell || '').trim() === '')
      if (!isEmptyRow) rows.push(row)
      row = []
      i += 1
      continue
    }

    value += char
    i += 1
  }

  row.push(value)
  const isEmptyRow = row.every((cell) => String(cell || '').trim() === '')
  if (!isEmptyRow) rows.push(row)

  return { rows, delimiter }
}

export function readCsvAsRows(text) {
  const { rows } = parseCsvRows(text)
  return rows
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function mapHeaders(headers) {
  const mappings = {
    nombre: 'Nombre',
    name: 'Nombre',
    categoria: 'Categoria',
    category: 'Categoria',
    codigosiges: 'CodigoSIGES',
    codsiges: 'CodigoSIGES',
    siges: 'CodigoSIGES',
    codigosicop: 'IdentificadorSICOP',
    identificadorsicop: 'IdentificadorSICOP',
    identificac: 'IdentificadorSICOP',
    identificador: 'IdentificadorSICOP',
    idsicop: 'IdentificadorSICOP',
    clasificadorsicop: 'ClasificadorSICOP',
    clasificador: 'ClasificadorSICOP',
    sicopclasificador: 'ClasificadorSICOP',
    sicopidentificador: 'IdentificadorSICOP',
    medicamento: 'Medicamento',
    descripcionsicop: 'Medicamento',
    descripcion: 'Medicamento',
    lote: 'Lote',
    batch: 'Lote',
    vencimiento: 'Vencimiento',
    expirydate: 'Vencimiento',
    stock: 'Stock',
    stockminimo: 'StockMinimo',
    minstock: 'StockMinimo',
    unidad: 'Unidad',
    unit: 'Unidad',
    producto: 'Medicamento',
    item: 'Medicamento',
    cantidad: 'Cantidad',
    consumo: 'Cantidad',
    salida: 'Cantidad',
    responsable: 'Responsable',
    usuario: 'Responsable',
    user: 'Responsable',
    motivo: 'Motivo',
    destino: 'Motivo',
    observacion: 'Motivo',
    fecha: 'Fecha',
    fechahora: 'Fecha',
    date: 'Fecha',
  }

  return headers.map((h) => mappings[normalizeHeader(h)] || String(h || '').trim())
}

export function normalizeDateInput(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const asString = String(value ?? '').trim()
  if (!asString) return new Date().toISOString().slice(0, 10)

  const dateOnly = asString.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly

  const tryDate = new Date(asString)
  if (!Number.isNaN(tryDate.getTime())) return tryDate.toISOString().slice(0, 10)

  return new Date().toISOString().slice(0, 10)
}

function escapeCsvValue(value, delimiter) {
  const asString = String(value ?? '')
  if (asString.includes('"') || asString.includes('\n') || asString.includes('\r') || asString.includes(delimiter)) {
    return `"${asString.replace(/"/g, '""')}"`
  }
  return asString
}

export function downloadCatalogTemplateCsv() {
  const delimiter = ';'
  const headers = ['CodigoSIGES', 'ClasificadorSICOP', 'IdentificadorSICOP', 'Medicamento', 'Categoria', 'Lote', 'Vencimiento', 'Stock', 'StockMinimo', 'Unidad']
  const example = ['SIG-0001', 'SICOP-CL-01', 'SICOP-ID-0001', 'Paracetamol', 'Analgésico', 'LOT-2025-01', '2027-12-31', 100, 20, 'Tabletas']

  const lines = [
    headers.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
    example.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
  ]

  const csv = `\uFEFF${lines.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_catalogo.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadMonthlyConsumptionTemplateCsv() {
  const delimiter = ';'
  const headers = ['CodigoSIGES', 'Medicamento', 'Consumo', 'Costo']
  const example = ['110-16-0010', 'Paracetamol', 1555.85, 1486210.15]

  const lines = [
    headers.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
    example.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
  ]

  const csv = `\uFEFF${lines.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_consumo_mensual.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function readCsvAsJson(text) {
  const { rows } = parseCsvRows(text)
  if (rows.length === 0) return []

  const rawHeaders = rows[0]
  const canonicalHeaders = mapHeaders(rawHeaders)
  const dataRows = rows.slice(1)

  return dataRows.map((row) => {
    const record = {}
    for (let index = 0; index < canonicalHeaders.length; index += 1) {
      const key = canonicalHeaders[index]
      if (!key) continue
      record[key] = row[index] ?? ''
    }
    return record
  })
}

export function downloadInventoryTemplateCsv(inventoryType) {
  const type = String(inventoryType || '772').trim() || '772'
  const delimiter = ';'
  const headers = [
    'CodigoSIGES',
    'ClasificadorSICOP',
    'IdentificadorSICOP',
    'Medicamento',
    'Categoria',
    'Lote',
    'Vencimiento',
    'Stock',
    'StockMinimo',
    'Unidad',
  ]
  const example = ['SIG-0001', 'SICOP-CL-01', 'SICOP-ID-0001', 'Paracetamol', 'General', 'LOT-2025-01', '2027-12-31', 100, 20, 'Tabletas']

  const lines = [
    headers.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
    example.map((v) => escapeCsvValue(v, delimiter)).join(delimiter),
  ]

  const csv = `\uFEFF${lines.join('\n')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantilla_inventario_${type}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadInventoryTemplateXml(inventoryType) {
  const type = String(inventoryType || '771').trim() || '771'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Inventario tipo="${type}">
  <Item>
    <CodigoSIGES>110-16-0010</CodigoSIGES>
    <Medicamento>Paracetamol</Medicamento>
    <Lote>LOT-2025-01</Lote>
    <Vencimiento>2027-12-31</Vencimiento>
    <Inventario>100</Inventario>
  </Item>
</Inventario>
`

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantilla_inventario_${type}.xml`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
