import { supabase } from '../../lib/supabaseClient.js'

function getRequiredSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  return supabase
}

function ensureId(medication) {
  if (medication?.id) return medication
  if (globalThis.crypto?.randomUUID) return { ...medication, id: globalThis.crypto.randomUUID() }
  return { ...medication, id: String(Date.now()) }
}

export const supabaseStore = {
  async getMedications() {
    const client = getRequiredSupabase()

    const pageSize = 1000
    let from = 0
    const all = []

    while (true) {
      const { data, error } = await client
        .from('medications')
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error
      const chunk = data ?? []
      all.push(...chunk)
      if (chunk.length < pageSize) break
      from += pageSize
    }

    return all
  },

  async clearMedicationsByInventoryType(inventoryType) {
    const client = getRequiredSupabase()
    const selectedType = String(inventoryType || '772')
    const { error } = await client.from('medications').delete().eq('inventory_type', selectedType)
    if (error) throw error
  },

  async upsertMedication(medication) {
    const client = getRequiredSupabase()
    const payload = ensureId(medication)
    const { data, error } = await client
      .from('medications')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async upsertMedications(medications) {
    const client = getRequiredSupabase()
    const payload = (medications ?? []).map(ensureId)
    const { data, error } = await client.from('medications').upsert(payload, { onConflict: 'id' }).select('*')
    if (error) throw error
    return data ?? []
  },

  async deleteMedication(id) {
    const client = getRequiredSupabase()
    const { error } = await client.from('medications').delete().eq('id', id)
    if (error) throw error
  },

  async clearMedications() {
    const client = getRequiredSupabase()
    const { error } = await client.from('medications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
  },

  async getMonthlyBatches() {
    const client = getRequiredSupabase()
    const { data, error } = await client
      .from('monthly_batches')
      .select('id,label,items:monthly_batch_items(id,siges_code,medication_name,quantity,cost)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((b) => ({ ...b, items: b.items ?? [] }))
  },

  async saveMonthlyBatch({ id, label, items }) {
    const client = getRequiredSupabase()

    const { data: batch, error: batchError } = await client
      .from('monthly_batches')
      .upsert({ id, label }, { onConflict: 'label' })
      .select('id,label')
      .single()
    if (batchError) throw batchError

    const { error: deleteError } = await client.from('monthly_batch_items').delete().eq('batch_id', batch.id)
    if (deleteError) throw deleteError

    const payload = (items ?? []).map((item) => ({
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + Math.random(),
      batch_id: batch.id,
      siges_code: item.siges_code,
      medication_name: item.medication_name,
      quantity: item.quantity,
      cost: item.cost,
    }))

    if (payload.length > 0) {
      const { error: insertError } = await client.from('monthly_batch_items').insert(payload)
      if (insertError) throw insertError
    }

    return { ...batch, items }
  },

  async getSelectedMonthlyBatchId() {
    return null
  },

  async setSelectedMonthlyBatchId() {},

  async getTertiaryPackaging() {
    const client = getRequiredSupabase()
    const { data, error } = await client
      .from('tertiary_packaging')
      .select('*')
      .order('siges_code', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async upsertTertiaryPackaging(items) {
    const client = getRequiredSupabase()
    const payload = (items ?? []).map((item) => ({
      id: item?.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + Math.random()),
      siges_code: String(item?.siges_code || '').trim(),
      medication_name: String(item?.medication_name || '').trim(),
      tertiary_quantity: Number(item?.tertiary_quantity) || 0,
    }))

    const filtered = payload.filter((p) => Boolean(p.siges_code))
    if (filtered.length === 0) return []

    const { data, error } = await client.from('tertiary_packaging').upsert(filtered, { onConflict: 'siges_code' }).select('*')
    if (error) throw error
    return data ?? []
  },

  async clearTertiaryPackaging() {
    const client = getRequiredSupabase()
    const { error } = await client
      .from('tertiary_packaging')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
  },

  async getMedicationCategories() {
    const client = getRequiredSupabase()
    const { data, error } = await client
      .from('medication_categories')
      .select('*')
      .order('siges_code', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async upsertMedicationCategories(items) {
    const client = getRequiredSupabase()
    const payload = (items ?? []).map((item) => ({
      id: item?.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + Math.random()),
      siges_code: String(item?.siges_code || '').trim(),
      medication_name: String(item?.medication_name || '').trim(),
      category: String(item?.category || '').trim(),
    }))

    const filtered = payload.filter((p) => Boolean(p.siges_code && p.category))
    if (filtered.length === 0) return []

    const { data, error } = await client.from('medication_categories').upsert(filtered, { onConflict: 'siges_code' }).select('*')
    if (error) throw error
    return data ?? []
  },

  async clearMedicationCategories() {
    const client = getRequiredSupabase()
    const { error } = await client
      .from('medication_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
  },
}
