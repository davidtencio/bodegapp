const STORAGE_KEYS = {
  medications: 'bodegapp:medications',
  monthlyBatches: 'bodegapp:monthlyBatches',
  selectedMonthlyBatchId: 'bodegapp:selectedMonthlyBatchId',
  tertiaryPackaging: 'bodegapp:tertiaryPackaging',
  medicationCategories: 'bodegapp:medicationCategories',
  orderCalendar: 'bodegapp:orderCalendar',
}

const seedMedications = [
  {
    id: 1,
    inventory_type: '772',
    name: 'Paracetamol',
    siges_code: 'SIG-0001',
    sicop_classifier: 'SICOP-CL-01',
    sicop_identifier: 'SICOP-ID-0001',
    category: 'Analgésico',
    batch: 'LOT-2023-01',
    expiry_date: '2025-12-30',
    stock: 500,
    min_stock: 100,
    unit: 'Tabletas',
  },
  {
    id: 2,
    inventory_type: '772',
    name: 'Amoxicilina',
    siges_code: 'SIG-0002',
    sicop_classifier: 'SICOP-CL-02',
    sicop_identifier: 'SICOP-ID-0002',
    category: 'Antibiotico',
    batch: 'LOT-2023-05',
    expiry_date: '2024-06-15',
    stock: 45,
    min_stock: 50,
    unit: 'Cápsulas',
  },
  {
    id: 3,
    inventory_type: '772',
    name: 'Ibuprofeno',
    siges_code: 'SIG-0003',
    sicop_classifier: 'SICOP-CL-03',
    sicop_identifier: 'SICOP-ID-0003',
    category: 'Antiinflamatorio',
    batch: 'LOT-2023-09',
    expiry_date: '2026-01-20',
    stock: 120,
    min_stock: 40,
    unit: 'Jarabe',
  },
  {
    id: 4,
    inventory_type: '772',
    name: 'Omeprazol',
    siges_code: 'SIG-0004',
    sicop_classifier: 'SICOP-CL-04',
    sicop_identifier: 'SICOP-ID-0004',
    category: 'Protector Gástrico',
    batch: 'LOT-2023-12',
    expiry_date: '2025-03-10',
    stock: 15,
    min_stock: 30,
    unit: 'Cápsulas',
  },
]

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readArray(key) {
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  const parsed = safeJsonParse(raw)
  return Array.isArray(parsed) ? parsed : null
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const localStore = {
  async getMedications() {
    return readArray(STORAGE_KEYS.medications) ?? seedMedications
  },

  async clearMedicationsByInventoryType(inventoryType) {
    const selectedType = String(inventoryType || '772')
    const current = (await this.getMedications()) ?? []
    const next = current.filter((m) => String(m.inventory_type || '772') !== selectedType)
    writeJson(STORAGE_KEYS.medications, next)
    return next
  },

  async upsertMedication(medication) {
    const current = (await this.getMedications()) ?? []
    const id = medication?.id
    const next =
      id == null
        ? [...current, medication]
        : current.some((m) => m.id === id)
          ? current.map((m) => (m.id === id ? medication : m))
          : [...current, medication]

    writeJson(STORAGE_KEYS.medications, next)
    return medication
  },

  async upsertMedications(medications) {
    const current = (await this.getMedications()) ?? []
    const byId = new Map(current.map((m) => [m.id, m]))
    for (const medication of medications) byId.set(medication.id, medication)
    const next = Array.from(byId.values())
    writeJson(STORAGE_KEYS.medications, next)
    return next
  },

  async deleteMedication(id) {
    const current = (await this.getMedications()) ?? []
    const next = current.filter((m) => m.id !== id)
    writeJson(STORAGE_KEYS.medications, next)
  },

  async clearMedications() {
    writeJson(STORAGE_KEYS.medications, [])
  },

  async getMonthlyBatches() {
    const batches = readArray(STORAGE_KEYS.monthlyBatches) ?? []
    return batches.map((b) => ({ ...b, id: b?.id != null ? String(b.id) : b.id }))
  },

  async saveMonthlyBatch(batch) {
    const current = (await this.getMonthlyBatches()) ?? []
    const normalized = { ...batch, id: batch?.id != null ? String(batch.id) : batch.id }
    const next = [normalized, ...current.filter((b) => String(b.id) !== String(normalized.id))]
    writeJson(STORAGE_KEYS.monthlyBatches, next)
    return normalized
  },

  async getSelectedMonthlyBatchId() {
    const raw = window.localStorage.getItem(STORAGE_KEYS.selectedMonthlyBatchId)
    const parsed = raw ? safeJsonParse(raw) ?? raw : null
    return parsed == null ? null : String(parsed)
  },

  async setSelectedMonthlyBatchId(id) {
    writeJson(STORAGE_KEYS.selectedMonthlyBatchId, id)
  },

  async getTertiaryPackaging() {
    return readArray(STORAGE_KEYS.tertiaryPackaging) ?? []
  },

  async upsertTertiaryPackaging(items) {
    const current = (await this.getTertiaryPackaging()) ?? []
    const byCode = new Map(current.map((item) => [String(item.siges_code || '').trim(), item]))

    for (const item of items ?? []) {
      const code = String(item?.siges_code || '').trim()
      if (!code) continue
      byCode.set(code, { ...item, siges_code: code })
    }

    const next = Array.from(byCode.values())
    writeJson(STORAGE_KEYS.tertiaryPackaging, next)
    return next
  },

  async clearTertiaryPackaging() {
    writeJson(STORAGE_KEYS.tertiaryPackaging, [])
  },

  async getMedicationCategories() {
    return readArray(STORAGE_KEYS.medicationCategories) ?? []
  },

  async upsertMedicationCategories(items) {
    const current = (await this.getMedicationCategories()) ?? []
    const byCode = new Map(current.map((item) => [String(item.siges_code || '').trim(), item]))

    for (const item of items ?? []) {
      const code = String(item?.siges_code || '').trim()
      if (!code) continue
      byCode.set(code, { ...item, siges_code: code })
    }

    const next = Array.from(byCode.values())
    writeJson(STORAGE_KEYS.medicationCategories, next)
    return next
  },

  async clearMedicationCategories() {
    writeJson(STORAGE_KEYS.medicationCategories, [])
  },

  async deleteMedicationCategory(id) {
    const current = (await this.getMedicationCategories()) ?? []
    const next = current.filter((item) => String(item.id) !== String(id))
    writeJson(STORAGE_KEYS.medicationCategories, next)
  },

  async getOrderCalendar() {
    return readArray(STORAGE_KEYS.orderCalendar) ?? []
  },

  async upsertOrderCalendarEntries(entries) {
    const current = (await this.getOrderCalendar()) ?? []
    const byKey = new Map(
      current.map((item) => [`${Number(item.year) || 0}-${Number(item.month) || 0}`, item]),
    )

    for (const entry of entries ?? []) {
      const year = Number(entry?.year) || 0
      const month = Number(entry?.month) || 0
      if (!year || month < 1 || month > 12) continue
      const key = `${year}-${month}`
      byKey.set(key, {
        ...entry,
        year,
        month,
        scheduled_receipt_date: entry?.scheduled_receipt_date ? String(entry.scheduled_receipt_date) : null,
      })
    }

    const next = Array.from(byKey.values())
    writeJson(STORAGE_KEYS.orderCalendar, next)
    return next
  },

  async clearOrderCalendar() {
    writeJson(STORAGE_KEYS.orderCalendar, [])
  },
}
