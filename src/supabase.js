import { createClient } from '@supabase/supabase-js'

const URL  = 'https://bhhrxotdiwdtltyitnyk.supabase.co'
const KEY  = 'sb_publishable_KhZUeXV_bLy24X6vOcKi8A_ilN_OWsW'

export const supabase = createClient(URL, KEY)

export async function uploadPhoto(file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('recipe-photos').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function insertRecipe(recipe) {
  const { data, error } = await supabase
    .from('recipes').insert([recipe]).select().single()
  if (error) throw error
  return data
}

export async function updateRecipe(id, updates) {
  const { data, error } = await supabase
    .from('recipes').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}
