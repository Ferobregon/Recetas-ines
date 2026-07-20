import { useState, useEffect, useRef } from 'react'
import { uploadPhoto, fetchRecipes, insertRecipe, updateRecipe, deleteRecipe, updateRating, fetchOrCreateWeeklyMenu, fetchMenuSlots, addMenuSlot, removeMenuSlot, fetchRecentMealHistory, fetchPantryItems, addPantryItem, removePantryItem, clearPantryItems, updateDayServings } from './supabase.js'
import { useRegisterSW } from 'virtual:pwa-register/react'

const C = { bg: '#F5F0E8', surface: '#FFFDF9', border: '#E8DED0', green: '#4A7C59', greenBg: '#EDF4EF', greenDark: '#2D5238', amber: '#B8763A', amberBg: '#FDF4E8', text: '#2C2416', textSec: '#7A6E5F', textMuted: '#B0A090', danger: '#C0392B' }
const MT = { desayuno: { bg: '#FEF8ED', tx: '#9A6B2A', ac: '#D4943A' }, comida: { bg: '#EDF4EF', tx: '#2D5238', ac: '#4A7C59' }, cena: { bg: '#F0EDF8', tx: '#4A3A7A', ac: '#7B6BBD' }, botana: { bg: '#FDF0EC', tx: '#8A3020', ac: '#C05A40' } }
const HT = { sano: { bg: '#EDF4EF', tx: '#2D5238' }, balanceado: { bg: '#EDF0F8', tx: '#2D3A6A' }, indulgente: { bg: '#FEF8ED', tx: '#8A5A1A' } }
const MTAGS = ['desayuno', 'comida', 'cena', 'botana']
const CTAGS = ['plato fuerte', 'verdura', 'sopa', 'acompañamiento', 'fruta', 'postre']
const ATAGS = ['fer', 'inés', 'todos']
const HTAGS = ['sano', 'balanceado', 'indulgente']
const UNITS = ['g','kg','ml','l','tsp','tbsp','taza','pza','diente','pizca','rebanada','hoja','porción']
const MEALS = [{ key: 'desayuno', label: 'Desayuno', icon: '☀️' }, { key: 'comida', label: 'Comida', icon: '🌞' }, { key: 'cena', label: 'Cena', icon: '🌙' }, { key: 'botana', label: 'Botana', icon: '🍎' }]
const serif = `Georgia,'Palatino Linotype',serif`
const sans = `-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const S = {
  app: { height: '100dvh', width: '100%', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: sans },
  screen: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  header: { padding: '52px 20px 16px', background: C.surface, borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 },
  card: { background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer' },
  pill: (bg, tx, small) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: small ? '3px 9px' : '5px 12px', borderRadius: 999, fontSize: small ? 11 : 12, fontWeight: 500, whiteSpace: 'nowrap', background: bg, color: tx }),
  tog: (active, abg, atx) => ({ padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', userSelect: 'none', border: active ? 'none' : `0.5px solid ${C.border}`, background: active ? abg : C.surface, color: active ? atx : C.textSec }),
  input: { width: '100%', padding: '11px 14px', borderRadius: 12, border: `0.5px solid ${C.border}`, fontSize: 15, background: C.surface, outline: 'none', color: C.text, fontFamily: sans },
  label: { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6, fontWeight: 500 },
  btn: (bg, tx) => ({ background: bg, color: tx, border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: sans }),
  fab: { position: 'absolute', bottom: 88, right: 20, width: 56, height: 56, borderRadius: '50%', background: C.green, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  divider: { height: '0.5px', background: C.border, margin: '16px 0' },
  sec: { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'block', fontWeight: 500 },
}

// ── UTILITIES ─────────────────────────────────────────────────────────────

function getWeekDates(offset = 0) {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function fmtDate(dateStr, opts = {}) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', opts)
}
function fmtDay(dateStr) { return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()] }
function fmtDayNum(dateStr) { return new Date(dateStr + 'T12:00:00').getDate() }

// ── SUGGESTION ALGORITHM ──────────────────────────────────────────────────

function pickWeighted(pool) {
  const sorted = [...pool].sort((a, b) => (b.rating || 0) - (a.rating || 0))
  const top = sorted.slice(0, 6)
  const weights = top.map((r, i) => Math.max(1, ((r.rating || 3) * 4) - i * 2))
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < top.length; i++) { rand -= weights[i]; if (rand <= 0) return top[i] }
  return top[0]
}

function suggestMenuSlots(recipes, history, days, existingSlots) {
  // No repetir la misma receta en la misma semana
  const usedThisWeek = new Set(existingSlots.map(s => s.recipe_id).filter(Boolean))
  // Preferir recetas no comidas en las últimas 2 semanas
  const recentIds = new Set(history.map(h => h.recipe_id).filter(Boolean))
  let indulgenteCount = existingSlots.filter(s => recipes.find(r => r.id === s.recipe_id)?.health_tag === 'indulgente').length
  const newSlots = []

  const prefer = (pool) => {
    const notRecent = pool.filter(r => !recentIds.has(r.id))
    return notRecent.length >= 1 ? notRecent : pool
  }

  for (const date of days) {
    const all = () => [...existingSlots, ...newSlots]

    for (const mealType of ['desayuno', 'comida', 'cena']) {
      const filledSlots = all().filter(s => s.date === date && s.meal_type === mealType)

      if (mealType === 'comida') {
        // Slot 0 — Proteína: plato fuerte (obligatorio)
        if (!filledSlots.some(s => s.slot_order === 0)) {
          // Primero busca con tag 'plato fuerte', si no hay usa cualquier comida
          let pool = recipes.filter(r => r.moment_tags?.includes('comida') && r.category_tags?.includes('plato fuerte') && !usedThisWeek.has(r.id))
          if (pool.length === 0) pool = recipes.filter(r => r.moment_tags?.includes('comida') && !usedThisWeek.has(r.id))
          pool = prefer(pool)
          if (pool.length > 0) {
            const picked = pickWeighted(pool)
            newSlots.push({ date, meal_type: 'comida', recipe_id: picked.id, slot_order: 0 })
            usedThisWeek.add(picked.id)
            if (picked.health_tag === 'indulgente') indulgenteCount++
          }
        }

        // Slot 1 — Verdura o sopa (opcional, solo si hay disponible)
        const hasProtein = all().some(s => s.date === date && s.meal_type === 'comida' && s.slot_order === 0)
        if (hasProtein && !filledSlots.some(s => s.slot_order === 1)) {
          let pool = recipes.filter(r =>
            r.moment_tags?.includes('comida') &&
            (r.category_tags?.includes('verdura') || r.category_tags?.includes('sopa')) &&
            !usedThisWeek.has(r.id)
          )
          pool = prefer(pool)
          if (pool.length > 0) {
            const picked = pickWeighted(pool)
            newSlots.push({ date, meal_type: 'comida', recipe_id: picked.id, slot_order: 1 })
            usedThisWeek.add(picked.id)
            if (picked.health_tag === 'indulgente') indulgenteCount++
          }
        }

      } else {
        // Desayuno y cena: 1 receta por día
        if (filledSlots.length > 0) continue
        let pool = recipes.filter(r => r.moment_tags?.includes(mealType) && !usedThisWeek.has(r.id))
        pool = prefer(pool)
        if (indulgenteCount >= 3) { const h = pool.filter(r => r.health_tag !== 'indulgente'); if (h.length > 0) pool = h }
        if (pool.length === 0) continue
        const picked = pickWeighted(pool)
        newSlots.push({ date, meal_type: mealType, recipe_id: picked.id, slot_order: 0 })
        usedThisWeek.add(picked.id)
        if (picked.health_tag === 'indulgente') indulgenteCount++
      }
    }
  }
  return newSlots
}


// ── SHOPPING & REFRI UTILS ────────────────────────────────────────────────

const SHOPPING_CATEGORIES = [
  { key: 'Proteínas', icon: '🥩' },
  { key: 'Frutas y verduras', icon: '🥬' },
  { key: 'Lácteos', icon: '🥛' },
  { key: 'Granos y legumbres', icon: '🌾' },
  { key: 'Despensa', icon: '🫙' },
  { key: 'Otros', icon: '📦' },
]

function categorizeIngredient(name) {
  const n = name.toLowerCase()
  if (/pollo|res|cerdo|carne|salmón|atún|camarón|pescado|chorizo|jamón|pavo|huevo|tocino|filete|lomo|pulpo|callo/.test(n)) return 'Proteínas'
  if (/leche|queso|crema|yogurt|mantequilla|nata/.test(n)) return 'Lácteos'
  if (/cebolla|ajo|tomate|jitomate|chile|pimiento|zanahoria|calabaza|espinaca|lechuga|brócoli|coliflor|pepino|aguacate|limón|naranja|mango|manzana|cilantro|perejil|apio|betabel|chayote|nopal|ejote|champiñón|hongo|papa|camote|poro/.test(n)) return 'Frutas y verduras'
  if (/arroz|pasta|harina|pan|tortilla|frijol|lenteja|garbanzo|avena|maíz|trigo|quinoa/.test(n)) return 'Granos y legumbres'
  if (/aceite|sal|pimienta|comino|orégano|canela|azúcar|vinagre|salsa|mostaza|mayonesa|caldo|consomé|soya|paprika|curry|laurel|tomillo|romero|vainilla/.test(n)) return 'Despensa'
  return 'Otros'
}

function parseQty(q) {
  if (q === null || q === undefined || q === '') return null
  const s = String(q).trim()
  const range = s.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/)
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : n
}

function normalizeIngKey(name) {
  // Remove accents and lowercase
  let n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  // Strip leading container/measure words
  n = n.replace(/^(hojas?\s+de\s+|dientes?\s+de\s+|bonch[eo]\s+(grande\s+)?de\s+|manojos?\s+de\s+|ramas?\s+de\s+|tallos?\s+de\s+|pizca\s+de\s+|pizca\s+)/, '')
  // Take only part before first comma
  n = n.split(',')[0].trim()
  // Strip trailing descriptors iteratively
  const trailing = [
    /\s+o\s+\S.*$/,
    /\s+finamente$/,
    /\s+o\s+m[aá]s$/,
    /\s+picad[oa]s?$/,
    /\s+rallad[oa]s?$/,
    /\s+trocead[oa]s?$/,
    /\s+rebanad[oa]s?$/,
    /\s+en\s+(cubos|plumas|rodajas|tiras|julianas|cuartos|brunoise)$/,
    /\s+sin\s+\w+(\s+\w+)?$/,
    /\s+(fresc[oa]s?|sec[oa]s?|cocid[oa]s?|crud[oa]s?)$/,
    /\s+con\s+\w+(\s+\w+)?$/,
  ]
  let changed = true
  while (changed) {
    changed = false
    for (const p of trailing) {
      const r = n.replace(p, '').trim()
      if (r && r !== n) { n = r; changed = true; break }
    }
  }
  return n
}

function consolidateIngredients(ingredientGroups) {
  const map = {}
  for (const ings of ingredientGroups) {
    for (const ing of ings) {
      const rawName = (ing.n || ing.name || '').trim()
      if (!rawName) continue
      const key = normalizeIngKey(rawName)
      if (!key) continue
      const qty = parseQty(ing.q)
      if (!map[key]) {
        const displayName = key.charAt(0).toUpperCase() + key.slice(1)
        map[key] = { name: displayName, q: qty, u: ing.u || '', category: categorizeIngredient(rawName) }
      } else {
        // Sum quantities when both are numeric
        if (qty !== null && map[key].q !== null) map[key].q += qty
        else if (qty !== null && map[key].q === null) map[key].q = qty
      }
    }
  }
  return Object.values(map).map(ing => ({
    ...ing,
    q: ing.q !== null ? (ing.q % 1 === 0 ? String(ing.q) : parseFloat(ing.q.toFixed(2)).toString()) : ''
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function matchRecipes(recipes, pantryItems) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const pantry = pantryItems.map(p => norm(p.name))
  const has = name => { const n = norm(name); return pantry.some(p => n.includes(p) || p.includes(n)) }
  const canMake = [], almostCanMake = []
  for (const recipe of recipes) {
    const ings = (recipe.ingredients || []).filter(i => (i.n || i.name || '').trim())
    if (!ings.length) continue
    const missing = ings.filter(i => !has(i.n || i.name || ''))
    if (missing.length === 0) canMake.push({ recipe, missing: [] })
    else if (missing.length <= 2) almostCanMake.push({ recipe, missing })
  }
  canMake.sort((a, b) => (b.recipe.rating || 0) - (a.recipe.rating || 0))
  almostCanMake.sort((a, b) => a.missing.length - b.missing.length || (b.recipe.rating || 0) - (a.recipe.rating || 0))
  return { canMake, almostCanMake }
}

// ── SHOPPING LIST ─────────────────────────────────────────────────────────

function ShoppingListScreen({ weekDays, slots, recipes, onClose }) {
  const [checked, setChecked] = useState(new Set())
  const weekStart = weekDays[0], weekEnd = weekDays[6]
  const weekLabel = `${fmtDate(weekStart, { day: 'numeric', month: 'short' })} – ${fmtDate(weekEnd, { day: 'numeric', month: 'short' })}`
  const scaledIngGroups = slots.map(slot => {
    const recipe = recipes.find(r => r.id === slot.recipe_id)
    if (!recipe) return []
    const scale = (recipe.servings || 2) > 0 ? (slot.servings ?? 2) / (recipe.servings || 2) : 1
    return (recipe.ingredients || []).map(ing => {
      const qty = parseQty(ing.q)
      return { ...ing, q: qty !== null ? String(Math.round(qty * scale * 100) / 100) : ing.q }
    })
  }).filter(g => g.length > 0)
  const ingredients = consolidateIngredients(scaledIngGroups)
  const grouped = {}
  for (const ing of ingredients) { if (!grouped[ing.category]) grouped[ing.category] = []; grouped[ing.category].push(ing) }
  const toggle = key => setChecked(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const done = checked.size, total = ingredients.length

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 14px', background: C.surface, borderBottom: `0.5px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 15, padding: 0 }}>Cerrar</button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: serif, margin: '0 0 2px' }}>Lista del súper</h2>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{weekLabel} · {done}/{total} listos</p>
        </div>
        <div style={{ width: 50 }} />
      </div>
      {ingredients.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, color: C.textMuted }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🛒</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.textSec, fontFamily: serif, marginBottom: 8 }}>Sin ingredientes</p>
          <p style={{ fontSize: 13, textAlign: 'center' }}>Agrega recetas al planificador para generar la lista</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 40px' }}>
          {done > 0 && (
            <div style={{ background: C.greenBg, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(done / total) * 100}%`, background: C.green, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 12, color: C.greenDark, fontWeight: 600 }}>{done}/{total}</span>
            </div>
          )}
          {SHOPPING_CATEGORIES.filter(cat => grouped[cat.key]).map(cat => (
            <div key={cat.key} style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{cat.icon}</span>{cat.key}
              </p>
              {grouped[cat.key].map(ing => {
                const key = ing.name.toLowerCase()
                const isDone = checked.has(key)
                return (
                  <div key={key} onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${isDone ? C.green : C.border}`, background: isDone ? C.green : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isDone && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, color: isDone ? C.textMuted : C.text, textDecoration: isDone ? 'line-through' : 'none' }}>{ing.name}</span>
                    {(ing.q || ing.u) && <span style={{ fontSize: 13, color: C.textMuted, flexShrink: 0 }}>{ing.q} {ing.u}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MODO REFRI ────────────────────────────────────────────────────────────

function RefriScreen({ recipes }) {
  const [items, setItems] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState(null)
  const inputRef = useRef()

  useEffect(() => { fetchPantryItems().then(setItems).catch(console.error).finally(() => setLoading(false)) }, [])

  const handleAdd = async (e) => {
    if (e?.key && e.key !== 'Enter') return
    const name = input.trim(); if (!name) return
    try { const saved = await addPantryItem(name); setItems(prev => [saved, ...prev]); setInput(''); setResults(null) } catch (err) { console.error(err) }
  }
  const handleRemove = async (id) => {
    try { await removePantryItem(id); setItems(prev => prev.filter(i => i.id !== id)); setResults(null) } catch (err) { console.error(err) }
  }
  const handleClear = async () => {
    try { await clearPantryItems(); setItems([]); setResults(null) } catch (err) { console.error(err) }
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: serif, letterSpacing: '-0.3px', marginBottom: 4 }}>Modo Refri</h1>
        <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 14px', lineHeight: 1.5 }}>Escribe lo que tienes y te digo qué puedes cocinar</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={inputRef} style={{ ...S.input, flex: 1 }} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleAdd} placeholder="Ej. pollo, cebolla, limón..." />
          <button onClick={() => handleAdd()} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 12, padding: '0 20px', fontSize: 22, cursor: 'pointer', flexShrink: 0, fontWeight: 300 }}>+</button>
        </div>
      </div>
      <div style={{ ...S.scroll, padding: '14px 20px', background: C.bg }}>
        {items.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={S.sec}>Tengo disponible</span>
              <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 12, fontWeight: 600, padding: 0 }}>Limpiar todo</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {items.map(item => <Pill key={item.id} label={item.name} small bg={C.greenBg} tx={C.greenDark} onX={() => handleRemove(item.id)} />)}
            </div>
          </div>
        )}
        {items.length > 0 && !results && (
          <button onClick={() => setResults(matchRecipes(recipes, items))} style={{ ...S.btn(C.green, '#fff'), marginBottom: 20 }}>
            Buscar recetas
          </button>
        )}
        {!loading && items.length === 0 && !results && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: C.textMuted }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🧊</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.textSec, fontFamily: serif, marginBottom: 6 }}>¿Qué tienes en el refri?</p>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>Agrega ingredientes arriba y te digo qué puedes cocinar ahora mismo</p>
          </div>
        )}
        {results && (
          <>
            <button onClick={() => setResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
              <Icon name="back" size={14} color={C.textSec} />Editar ingredientes
            </button>
            {results.canMake.length === 0 && results.almostCanMake.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
                <p style={{ fontSize: 14, marginBottom: 6 }}>No encontré recetas con lo que tienes</p>
                <p style={{ fontSize: 12 }}>Prueba agregando más ingredientes</p>
              </div>
            )}
            {results.canMake.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 15 }}>✅</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.greenDark, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Puedes hacer ahora · {results.canMake.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                  {results.canMake.map(({ recipe }) => <RecipeCard key={recipe.id} r={recipe} onClick={() => {}} />)}
                </div>
              </>
            )}
            {results.almostCanMake.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 15 }}>🛒</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Te falta poco · {results.almostCanMake.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 80 }}>
                  {results.almostCanMake.map(({ recipe, missing }) => (
                    <div key={recipe.id} style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, overflow: 'hidden' }}>
                      <RecipeCard r={recipe} onClick={() => {}} />
                      <div style={{ padding: '10px 14px', borderTop: `0.5px solid ${C.border}`, background: C.amberBg, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>Falta:</span>
                        {missing.map((ing, i) => <Pill key={i} label={ing.n || ing.name} small bg={C.amberBg} tx={C.amber} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────

const Pill = ({ label, bg, tx, small, onX }) => (
  <span style={S.pill(bg, tx, small)} onClick={onX ? e => { e.stopPropagation(); onX() } : undefined}>
    {label}{onX && <span style={{ fontSize: 14, marginLeft: 2 }}>×</span>}
  </span>
)
const Toggle = ({ label, active, abg, atx, onClick }) => (<span style={S.tog(active, abg, atx)} onClick={onClick}>{label}</span>)
const Icon = ({ name, size = 20, color = 'currentColor', style: st }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={st}>
    {name === 'back' && <polyline points="15 18 9 12 15 6" />}
    {name === 'plus' && <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
    {name === 'search' && <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>}
    {name === 'filter' && <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />}
    {name === 'x' && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
    {name === 'trash' && <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></>}
    {name === 'edit' && <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>}
    {name === 'camera' && <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>}
    {name === 'users' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}
    {name === 'clock' && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
    {name === 'refresh' && <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>}
    {name === 'book' && <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>}
    {name === 'pencil' && <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>}
    {name === 'link' && <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>}
    {name === 'user' && <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
    {name === 'calendar' && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
    {name === 'share' && <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>}
    {name === 'fridge' && <><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="2" x2="9" y2="9"/><line x1="8" y1="14" x2="10" y2="14"/></>}
    {name === 'cart' && <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>}
  </svg>
)
const StarRating = ({ value, onChange, size = 24, gap = 4 }) => (
  <div style={{ display: 'flex', gap }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} onClick={onChange ? () => onChange(i) : undefined} style={{ fontSize: size, cursor: onChange ? 'pointer' : 'default', color: i <= (value || 0) ? C.amber : C.border, lineHeight: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>★</span>
    ))}
  </div>
)

// ── PLANNER COMPONENTS ────────────────────────────────────────────────────

function RecipePickerModal({ mealType, onPick, onClose, recipes }) {
  const [search, setSearch] = useState('')
  const ref = useRef()
  useEffect(() => { setTimeout(() => ref.current?.focus(), 100) }, [])

  const candidates = recipes.filter(r => {
    if (!r.moment_tags?.includes(mealType)) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => (b.rating || 0) - (a.rating || 0))

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.surface, borderRadius: '20px 20px 0 0', maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: serif, margin: 0 }}>
              Agregar a {mealType}
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size={20} color={C.textSec} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={15} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input ref={ref} style={{ ...S.input, paddingLeft: 34, fontSize: 14 }} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receta..." />
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          {candidates.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textMuted }}>
              <p style={{ fontSize: 14, marginBottom: 6 }}>No hay recetas para {mealType}</p>
              <p style={{ fontSize: 12 }}>Agrega el tag "{mealType}" a tus recetas</p>
            </div>
          )}
          {candidates.map(r => (
            <div key={r.id} onClick={() => onPick(r.id)} style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer', active: 'background:#F0EDF0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.photo_url ? <img src={r.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 20, fontFamily: serif, fontWeight: 700, color: C.green }}>{r.title[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: C.text, margin: '0 0 3px', fontFamily: serif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                {r.rating ? <StarRating value={r.rating} size={11} gap={1} /> : <span style={{ fontSize: 11, color: C.textMuted }}>Sin calificación</span>}
              </div>
              <Icon name="plus" size={18} color={C.green} />
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  )
}

function ShareModal({ weekDays, slots, recipes, onClose }) {
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const weekLabel = `${fmtDate(weekStart, { day: 'numeric', month: 'short' })} – ${fmtDate(weekEnd, { day: 'numeric', month: 'short' })}`
  const getRecipe = id => recipes.find(r => r.id === id)
  const getDaySlots = (date, mt) => slots.filter(s => s.date === date && s.meal_type === mt).sort((a, b) => a.slot_order - b.slot_order)

  const handleNativeShare = async () => {
    const lines = [`🗓 Menú ${weekLabel}\n`]
    for (const date of weekDays) {
      const hasMeals = MEALS.some(m => getDaySlots(date, m.key).length > 0)
      if (!hasMeals) continue
      lines.push(`${fmtDay(date)} ${fmtDayNum(date)}`)
      for (const { key, icon, label } of MEALS) {
        const ds = getDaySlots(date, key)
        if (!ds.length) continue
        const names = ds.map(s => getRecipe(s.recipe_id)?.title).filter(Boolean).join(' + ')
        lines.push(`  ${icon} ${names}`)
      }
      lines.push('')
    }
    try {
      await navigator.share({ title: `Menú ${weekLabel}`, text: lines.join('\n') })
    } catch (e) { /* user cancelled or not supported */ }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 14px', background: C.surface, borderBottom: `0.5px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 15, padding: 0 }}>Cerrar</button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: serif, margin: 0 }}>Menú {weekLabel}</h2>
        {navigator.share ? (
          <button onClick={handleNativeShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 15, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="share" size={17} color={C.green} />Compartir
          </button>
        ) : <div style={{ width: 70 }} />}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 40px' }}>
        {!navigator.share && <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 16 }}>Toma una captura de pantalla para guardar o compartir</p>}
        {weekDays.map(date => {
          const hasMeals = MEALS.some(m => getDaySlots(date, m.key).length > 0)
          if (!hasMeals) return <div key={date} style={{ background: C.surface, borderRadius: 14, border: `0.5px solid ${C.border}`, padding: '12px 16px', marginBottom: 8, opacity: 0.4 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.textMuted, fontFamily: serif, margin: 0 }}>{fmtDay(date)} {fmtDayNum(date)} — sin planificar</p>
          </div>
          return (
            <div key={date} style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, padding: '14px 16px', marginBottom: 10 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: C.text, fontFamily: serif, marginBottom: 10, margin: '0 0 10px' }}>{fmtDay(date)} {fmtDayNum(date)}</p>
              {MEALS.map(({ key, icon }) => {
                const ds = getDaySlots(date, key)
                if (!ds.length) return null
                return (
                  <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, width: 22, flexShrink: 0, lineHeight: '20px' }}>{icon}</span>
                    <div>{ds.map(s => { const r = getRecipe(s.recipe_id); return r ? <p key={s.id} style={{ fontSize: 13, color: C.text, margin: '0 0 2px', lineHeight: 1.4 }}>{r.title}</p> : null })}</div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlannerScreen({ recipes }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [currentMenu, setCurrentMenu] = useState(null)
  const [slots, setSlots] = useState([])
  const [mealHistory, setMealHistory] = useState([])
  const [showPicker, setShowPicker] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [showShopping, setShowShopping] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [loading, setLoading] = useState(true)

  const weekDays = getWeekDates(weekOffset)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const weekLabel = `${fmtDate(weekStart, { day: 'numeric', month: 'short' })} – ${fmtDate(weekEnd, { day: 'numeric', month: 'short' })}`
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setSelectedDate(weekDays.includes(today) ? today : weekDays[0])
  }, [weekOffset])

  useEffect(() => {
    loadWeek()
  }, [weekOffset])

  const loadWeek = async () => {
    setLoading(true)
    setSlots([])
    setCurrentMenu(null)
    try {
      const [menu, history] = await Promise.all([
        fetchOrCreateWeeklyMenu(weekStart, weekEnd),
        fetchRecentMealHistory(14)
      ])
      setCurrentMenu(menu)
      setMealHistory(history)
      const ms = await fetchMenuSlots(menu.id)
      setSlots(ms)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleAddSlot = async (recipe_id) => {
    if (!showPicker || !currentMenu) return
    const { date, meal_type } = showPicker
    const existing = slots.filter(s => s.date === date && s.meal_type === meal_type)
    if (existing.length >= 3) return
    try {
      const saved = await addMenuSlot({ menu_id: currentMenu.id, date, meal_type, slot_order: existing.length, recipe_id })
      setSlots(prev => [...prev, saved])
    } catch (e) { console.error(e) }
    setShowPicker(null)
  }

  const handleRemoveSlot = async (slotId) => {
    try {
      await removeMenuSlot(slotId)
      setSlots(prev => prev.filter(s => s.id !== slotId))
    } catch (e) { console.error(e) }
  }

  const handleSuggest = async () => {
    if (!currentMenu || suggesting || recipes.length === 0) return
    setSuggesting(true)
    const newSlotDefs = suggestMenuSlots(recipes, mealHistory, weekDays, slots)
    try {
      const saved = []
      for (const slotDef of newSlotDefs) {
        const s = await addMenuSlot({ menu_id: currentMenu.id, ...slotDef })
        saved.push(s)
      }
      setSlots(prev => [...prev, ...saved])
    } catch (e) { console.error(e) }
    setSuggesting(false)
  }

  const getDaySlots = (date, mealType) =>
    slots.filter(s => s.date === date && s.meal_type === mealType).sort((a, b) => a.slot_order - b.slot_order)
  const getRecipe = id => recipes.find(r => r.id === id)
  const totalFilled = slots.length
  const hasAny = weekDays.some(d => MEALS.some(m => getDaySlots(d, m.key).length > 0))
  const dayServings = slots.find(s => s.date === selectedDate)?.servings ?? 2
  const changeDayServings = async (n) => {
    if (!currentMenu) return
    setSlots(prev => prev.map(s => s.date === selectedDate ? { ...s, servings: n } : s))
    try { await updateDayServings(currentMenu.id, selectedDate, n) } catch (e) { console.error(e) }
  }

  return (
    <div style={{ ...S.screen, position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 14px', background: C.surface, borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: serif, margin: 0 }}>Planificador</h1>
          <button
            onClick={handleSuggest}
            disabled={suggesting || recipes.length === 0}
            style={{ background: totalFilled === 0 ? C.amber : C.amberBg, color: totalFilled === 0 ? '#fff' : C.amber, border: 'none', borderRadius: 12, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: (suggesting || recipes.length === 0) ? 0.5 : 1 }}
          >
            {suggesting ? '...' : '⚡ Sugerir semana'}
          </button>
        </div>
        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg, borderRadius: 12, padding: '4px 4px' }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', color: C.textSec, fontSize: 22, lineHeight: 1 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => o + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', color: C.textSec, fontSize: 22, lineHeight: 1 }}>›</button>
        </div>
      </div>

      {/* Day tabs */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, background: C.surface, borderBottom: `0.5px solid ${C.border}` }}>
        {weekDays.map(date => {
          const active = date === selectedDate
          const hasSlotsToday = slots.some(s => s.date === date)
          const isToday = date === today
          return (
            <button key={date} onClick={() => setSelectedDate(date)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 10px', borderRadius: 12, border: isToday && !active ? `1.5px solid ${C.green}` : 'none', cursor: 'pointer', flexShrink: 0, background: active ? C.green : 'transparent', minWidth: 42, gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'rgba(255,255,255,.8)' : C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{fmtDay(date)}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: active ? '#fff' : isToday ? C.green : C.text, lineHeight: 1.2 }}>{fmtDayNum(date)}</span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? 'rgba(255,255,255,.6)' : hasSlotsToday ? C.green : 'transparent' }} />
            </button>
          )
        })}
      </div>

      {/* Day content */}
      <div style={{ ...S.scroll, padding: '14px 20px', background: C.bg }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}><p style={{ fontSize: 14 }}>Cargando menú...</p></div>
        ) : recipes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.textSec, fontFamily: serif, marginBottom: 8 }}>Primero agrega recetas</p>
            <p style={{ fontSize: 13 }}>Necesitas recetas con tags de momento (desayuno, comida, cena) para planificar</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: serif, margin: 0 }}>
                {fmtDay(selectedDate)}, {fmtDate(selectedDate, { day: 'numeric', month: 'long' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '4px 8px' }}>
                <span style={{ fontSize: 12 }}>👥</span>
                <button onClick={() => changeDayServings(Math.max(1, dayServings - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: C.textSec, lineHeight: 1, padding: '0 2px' }}>−</button>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 16, textAlign: 'center' }}>{dayServings}</span>
                <button onClick={() => changeDayServings(dayServings + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: C.textSec, lineHeight: 1, padding: '0 2px' }}>+</button>
              </div>
            </div>
            {MEALS.map(({ key: mealType, label, icon }) => {
              const daySlots = getDaySlots(selectedDate, mealType)
              const mc = MT[mealType] || { bg: C.greenBg, tx: C.greenDark, ac: C.green }
              return (
                <div key={mealType} style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: daySlots.length > 0 ? 10 : 0 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: mc.tx, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                  </div>
                  {daySlots.map(slot => {
                    const r = getRecipe(slot.recipe_id)
                    if (!r) return null
                    return (
                      <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `0.5px solid ${C.border}` }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, overflow: 'hidden', background: mc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.photo_url ? <img src={r.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 17, fontWeight: 700, color: mc.ac, fontFamily: serif }}>{r.title[0]}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px', fontFamily: serif, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                          {r.rating && <StarRating value={r.rating} size={10} gap={1} />}
                        </div>
                        <button onClick={() => handleRemoveSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>
                          <Icon name="x" size={16} color={C.textMuted} />
                        </button>
                      </div>
                    )
                  })}
                  {daySlots.length < 3 && (
                    <button onClick={() => setShowPicker({ date: selectedDate, meal_type: mealType })} style={{ width: '100%', padding: '9px', background: 'none', border: `1px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: daySlots.length > 0 ? 8 : 0 }}>
                      <Icon name="plus" size={13} color={C.textMuted} />Agregar
                    </button>
                  )}
                </div>
              )
            })}
            {hasAny && (
              <div style={{ marginTop: 6, marginBottom: 80, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setShowShare(true)} style={{ ...S.btn(C.green, '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Icon name="share" size={18} color="#fff" />Ver menú completo
                </button>
                <button onClick={() => setShowShopping(true)} style={{ background: C.amberBg, color: C.amber, border: `1px solid ${C.amber}44`, borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  🛒 Lista del súper
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showPicker && <RecipePickerModal mealType={showPicker.meal_type} recipes={recipes} onPick={handleAddSlot} onClose={() => setShowPicker(null)} />}
      {showShare && <ShareModal weekDays={weekDays} slots={slots} recipes={recipes} onClose={() => setShowShare(false)} />}
      {showShopping && <ShoppingListScreen weekDays={weekDays} slots={slots} recipes={recipes} onClose={() => setShowShopping(false)} />}
    </div>
  )
}

// ── RECIPE COMPONENTS ─────────────────────────────────────────────────────

function RecipeCard({ r, onClick }) {
  const th = MT[r.moment_tags?.[0]]
  return (
    <div style={S.card} onClick={onClick}>
      <div style={{ width: 68, height: 68, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: th ? th.bg + '88' : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {r.photo_url ? <img src={r.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 28, fontWeight: 700, color: th ? th.ac : C.textMuted, fontFamily: serif }}>{r.title[0]}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8, fontFamily: serif }}>{r.title}</p>
          {r.rating && <StarRating value={r.rating} size={12} gap={1} />}
        </div>
        {r.description && <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {r.moment_tags?.slice(0, 2).map(t => <Pill key={t} label={t} small bg={MT[t]?.bg || C.greenBg} tx={MT[t]?.tx || C.greenDark} />)}
          {r.health_tag && <Pill label={r.health_tag} small bg={HT[r.health_tag]?.bg || C.greenBg} tx={HT[r.health_tag]?.tx || C.greenDark} />}
          {r.is_simple && <Pill label="receta simple" small bg={C.border} tx={C.textMuted} />}
        </div>
      </div>
    </div>
  )
}

function ListScreen({ recipes, loading, onAdd, onSel, filters, setFilters, search, setSearch, onFilter, sort, setSort }) {
  const active = Object.values(filters).flat()
  const list = recipes.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (filters.mt?.length && !filters.mt.some(t => r.moment_tags?.includes(t))) return false
    if (filters.ct?.length && !filters.ct.some(t => r.category_tags?.includes(t))) return false
    if (filters.at?.length && !filters.at.some(t => r.audience_tags?.includes(t))) return false
    if (filters.ht?.length && !filters.ht.includes(r.health_tag)) return false
    return true
  }).sort((a, b) => sort === 'rating' ? (b.rating || 0) - (a.rating || 0) : sort === 'alpha' ? a.title.localeCompare(b.title, 'es') : 0)

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: serif, letterSpacing: '-0.3px' }}>Mis recetas</h1>
          <span style={{ fontSize: 13, color: C.textMuted }}>{recipes.length} guardadas</span>
        </div>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input style={{ ...S.input, paddingLeft: 36 }} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar recetas..." />
        </div>
      </div>
      <div style={{ padding: '10px 20px 8px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, background: C.surface, borderBottom: `0.5px solid ${C.border}` }}>
        <button onClick={onFilter} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, border: active.length ? 'none' : `0.5px solid ${C.border}`, background: active.length ? C.greenBg : C.surface, color: active.length ? C.greenDark : C.textSec, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="filter" size={13} color={active.length ? C.greenDark : C.textSec} />
          Filtros{active.length ? ` · ${active.length}` : ''}
        </button>
        <button onClick={() => setSort(s => s === 'alpha' ? 'rating' : s === 'rating' ? 'new' : 'alpha')} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, border: sort !== 'new' ? 'none' : `0.5px solid ${C.border}`, background: sort === 'rating' ? C.amberBg : sort === 'alpha' ? C.greenBg : C.surface, color: sort === 'rating' ? C.amber : sort === 'alpha' ? C.greenDark : C.textSec, display: 'flex', alignItems: 'center', gap: 4 }}>
          {sort === 'rating' ? '★ Mejor calificadas' : sort === 'alpha' ? 'A → Z' : '🕐 Recientes'}
        </button>
        {active.map((v, i) => <Pill key={i} label={v} small bg={C.greenBg} tx={C.greenDark} onX={() => setFilters(f => { const n = { ...f }; for (const k of Object.keys(n)) n[k] = n[k].filter(x => x !== v); return n })} />)}
      </div>
      <div style={{ ...S.scroll, padding: '12px 20px 0', background: C.bg }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}><p style={{ fontSize: 15 }}>Cargando recetas...</p></div>}
        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '70px 0 0', color: C.textMuted }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="search" size={28} color={C.green} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.textSec, marginBottom: 6, fontFamily: serif }}>{recipes.length === 0 ? 'Tu recetario está vacío' : 'Sin resultados'}</p>
            <p style={{ fontSize: 13, color: C.textMuted }}>{recipes.length === 0 ? 'Toca + para agregar tu primera receta' : 'Prueba con otros filtros'}</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 120 }}>
          {list.map(r => <RecipeCard key={r.id} r={r} onClick={() => onSel(r)} />)}
        </div>
      </div>
      <button style={S.fab} onClick={onAdd} aria-label="Agregar receta"><Icon name="plus" size={26} color="#fff" /></button>
    </div>
  )
}

function DetailScreen({ r, onBack, onEdit, onDelete, onRate }) {
  const th = MT[r.moment_tags?.[0]]
  const total = (r.prep_time || 0) + (r.cook_time || 0)
  const [delConfirm, setDelConfirm] = useState(false)
  const [localRating, setLocalRating] = useState(r.rating || 0)
  const [rateSaved, setRateSaved] = useState(false)

  const handleRate = async (v) => {
    setLocalRating(v); setRateSaved(false)
    await onRate(v)
    setRateSaved(true)
    setTimeout(() => setRateSaved(false), 2000)
  }

  return (
    <div style={S.screen}>
      <div style={{ height: 220, flexShrink: 0, position: 'relative', background: th ? th.bg : C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {r.photo_url ? <img src={r.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={r.title} /> : <span style={{ fontSize: 100, fontWeight: 700, color: th ? th.ac : C.green, opacity: .2, fontFamily: serif }}>{r.title[0]}</span>}
        <button style={{ position: 'absolute', top: 52, left: 16, background: 'rgba(255,255,255,.88)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={onBack}><Icon name="back" size={20} color={C.text} /></button>
        <div style={{ position: 'absolute', top: 52, right: 16, display: 'flex', gap: 8 }}>
          <button style={{ background: 'rgba(255,255,255,.88)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={onEdit}><Icon name="edit" size={18} color={C.text} /></button>
          <button style={{ background: 'rgba(255,255,255,.88)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setDelConfirm(true)}><Icon name="trash" size={18} color={C.danger} /></button>
        </div>
      </div>
      <div style={{ ...S.scroll, background: C.bg }}>
        <div style={{ background: C.surface, padding: '20px 20px 0' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: serif, lineHeight: 1.2, marginBottom: 6 }}>{r.title}</h2>
          {r.description && <p style={{ fontSize: 14, color: C.textSec, marginBottom: 10, lineHeight: 1.6 }}>{r.description}</p>}
          {r.source_author && <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="user" size={13} color={C.textMuted} />{r.source_author} · {r.source_type}</p>}
          <div style={{ display: 'flex', gap: 14, fontSize: 13, color: C.textSec, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="users" size={14} color={C.textMuted} />{r.servings} porciones</span>
            {total > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={14} color={C.textMuted} />{total} min</span>}
            {r.times_made > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="refresh" size={14} color={C.textMuted} />{r.times_made}× hecho</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 14, borderBottom: `0.5px solid ${C.border}` }}>
            {r.moment_tags?.map(t => <Pill key={t} label={t} bg={MT[t]?.bg || C.greenBg} tx={MT[t]?.tx || C.greenDark} />)}
            {r.category_tags?.map(t => <Pill key={t} label={t} bg={C.border} tx={C.textSec} />)}
            {r.audience_tags?.map(t => <Pill key={t} label={t} bg='#F0EDF8' tx='#4A3A7A' />)}
            {r.health_tag && <Pill label={r.health_tag} bg={HT[r.health_tag]?.bg || C.greenBg} tx={HT[r.health_tag]?.tx || C.greenDark} />}
          </div>
          <div style={{ padding: '16px 0', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <StarRating value={localRating} onChange={handleRate} size={32} gap={6} />
            <span style={{ fontSize: 13, color: rateSaved ? C.green : C.textMuted, fontWeight: rateSaved ? 600 : 400, transition: 'color 0.3s' }}>
              {rateSaved ? '✓ Guardado' : localRating > 0 ? `${localRating}/5` : 'Sin calificación'}
            </span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '18px 0 12px', color: C.text, fontFamily: serif }}>Ingredientes</h3>
          {(r.ingredients || []).map((g, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `0.5px solid ${C.border}`, fontSize: 14 }}>
              <span style={{ color: C.text }}>{g.n || g.name}</span>
              <span style={{ color: C.textMuted, fontWeight: 500 }}>{g.q || g.qty} {g.u || g.unit}</span>
            </div>
          ))}
          {!r.is_simple && r.steps?.length > 0 && <>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '20px 0 14px', color: C.text, fontFamily: serif }}>Preparación</h3>
            {r.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: C.greenBg, color: C.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
                <p style={{ fontSize: 14, color: C.text, margin: 0, lineHeight: 1.7, paddingTop: 4 }}>{step}</p>
              </div>
            ))}
          </>}
          {r.notes && <div style={{ background: C.amberBg, borderRadius: 12, padding: '14px', margin: '16px 0', border: `0.5px solid #E8C87A` }}>
            <p style={{ fontSize: 11, color: C.amber, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Notas</p>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, margin: 0 }}>{r.notes}</p>
          </div>}
          <div style={{ height: 32 }} />
        </div>
      </div>
      {delConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,22,.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}>
          <div style={{ background: C.surface, width: '100%', borderRadius: '20px 20px 0 0', padding: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.text, fontFamily: serif }}>Eliminar receta</h3>
            <p style={{ color: C.textSec, marginBottom: 20, fontSize: 15, lineHeight: 1.5 }}>¿Seguro que quieres eliminar "{r.title}"?</p>
            <button style={{ ...S.btn(C.danger, '#fff'), marginBottom: 10 }} onClick={onDelete}>Sí, eliminar</button>
            <button style={{ ...S.btn(C.border, C.text) }} onClick={() => setDelConfirm(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterScreen({ filters, setFilters, onBack }) {
  const [loc, setLoc] = useState({ ...filters })
  const tog = (k, v) => setLoc(f => ({ ...f, [k]: (f[k] || []).includes(v) ? f[k].filter(x => x !== v) : [...(f[k] || []), v] }))
  const secs = [
    { k: 'mt', label: 'Momento del día', opts: MTAGS, abg: t => MT[t]?.bg || C.greenBg, atx: t => MT[t]?.tx || C.greenDark },
    { k: 'ct', label: 'Tipo de platillo', opts: CTAGS, abg: () => C.greenBg, atx: () => C.greenDark },
    { k: 'at', label: '¿Para quién?', opts: ATAGS, abg: () => '#F0EDF8', atx: () => '#4A3A7A' },
    { k: 'ht', label: 'Qué tan sano', opts: HTAGS, abg: t => HT[t]?.bg || C.greenBg, atx: t => HT[t]?.tx || C.greenDark },
  ]
  return (
    <div style={S.screen}>
      <div style={{ ...S.header, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 15, padding: 0 }} onClick={onBack}>Cancelar</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: serif }}>Filtros</h2>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, fontSize: 15, padding: 0 }} onClick={() => setLoc({ mt: [], ct: [], at: [], ht: [] })}>Limpiar</button>
      </div>
      <div style={{ ...S.scroll, padding: '20px', background: C.bg }}>
        {secs.map(sec => (
          <div key={sec.k} style={{ marginBottom: 26 }}>
            <span style={S.sec}>{sec.label}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sec.opts.map(o => <Toggle key={o} label={o} active={(loc[sec.k] || []).includes(o)} abg={sec.abg(o)} atx={sec.atx(o)} onClick={() => tog(sec.k, o)} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 20px 32px', background: C.surface, borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <button style={S.btn(C.green, '#fff')} onClick={() => { setFilters(loc); onBack() }}>Aplicar filtros</button>
      </div>
    </div>
  )
}

const BLANK = { title: '', description: '', ingredients: [{ n: '', q: '', u: '' }], steps: [''], source_type: 'manual', source_author: '', servings: 2, prep_time: '', cook_time: '', is_simple: false, moment_tags: [], category_tags: [], audience_tags: ['todos'], health_tag: 'balanceado', photo_url: null, notes: '' }

function RecipeForm({ initial, onBack, onSave, onSaveLabel = 'Guardar' }) {
  const [flow, setFlow] = useState(initial ? 'form' : 'src')
  const [f, setF] = useState(initial ? { ...initial, ingredients: initial.ingredients?.length ? initial.ingredients : [{ n: '', q: '', u: '' }], steps: initial.steps?.length ? initial.steps : [''], moment_tags: initial.moment_tags || [], category_tags: initial.category_tags || [], audience_tags: initial.audience_tags || ['todos'] } : { ...BLANK })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef()
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const tog = (k, v) => setF(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }))
  const handlePhotoExtract = async (ev) => {
    const file = ev.target.files?.[0]; if (!file) return
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file))
    setFlow('ext'); setErr('')
    try {
      const b64 = await new Promise((resolve, reject) => {
        const objUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            let w = img.width, h = img.height, MAX = 900
            if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX } } else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX } }
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas no soportado')
            ctx.drawImage(img, 0, 0, w, h)
            URL.revokeObjectURL(objUrl)
            resolve(canvas.toDataURL('image/jpeg', 0.65).split(',')[1])
          } catch (err) { URL.revokeObjectURL(objUrl); reject(err) }
        }
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('Error cargando imagen')) }
        img.src = objUrl
      })
      const res = await fetch('https://bhhrxotdiwdtltyitnyk.supabase.co/functions/v1/extract-recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, mimeType: 'image/jpeg' }) })
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + await res.text())
      const p = await res.json()
      if (p.error) throw new Error(p.error)
      setF(prev => ({ ...prev, ...p, photo_url: prev.photo_url, source_type: prev.source_type, audience_tags: ['todos'], health_tag: p.health_tag || 'balanceado', moment_tags: p.moment_tags || [], category_tags: p.category_tags || [], ingredients: p.ingredients?.length ? p.ingredients : [{ n: '', q: '', u: '' }], steps: p.steps?.length ? p.steps : [''] }))
    } catch (e) { setErr('Error al extraer: ' + (e.message || 'intenta de nuevo')) }
    setFlow('form')
  }
  const handleManualPhoto = (ev) => { const file = ev.target.files?.[0]; if (!file) return; setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
  const updI = (i, k, v) => setF(p => { const a = [...p.ingredients]; a[i] = { ...a[i], [k]: v }; return { ...p, ingredients: a } })
  const addI = () => setF(p => ({ ...p, ingredients: [...p.ingredients, { n: '', q: '', u: '' }] }))
  const delI = (i) => setF(p => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }))
  const updS = (i, v) => setF(p => { const a = [...p.steps]; a[i] = v; return { ...p, steps: a } })
  const addS = () => setF(p => ({ ...p, steps: [...p.steps, ''] }))
  const delS = (i) => setF(p => ({ ...p, steps: p.steps.filter((_, j) => j !== i) }))
  const save = async () => {
    if (!f.title.trim()) { setErr('El nombre es obligatorio.'); return }
    setSaving(true); setErr('')
    try {
      let photoUrl = f.photo_url
      if (photoFile) photoUrl = await uploadPhoto(photoFile)
      const toInt = (v, def = 0) => v === '' || v == null ? def : Number(v) || def
      const recipe = { ...f, photo_url: photoUrl, times_made: f.times_made || 0, prep_time: toInt(f.prep_time), cook_time: toInt(f.cook_time), servings: toInt(f.servings, 2) }
      delete recipe.id
      await onSave(recipe)
    } catch (e) { setErr('Error al guardar. Intenta de nuevo.'); setSaving(false) }
  }
  if (flow === 'src') return (
    <div style={S.screen}>
      <div style={{ ...S.header, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={onBack}><Icon name="back" size={22} color={C.text} /></button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: serif }}>Agregar receta</h2>
      </div>
      <div style={{ ...S.scroll, padding: '20px', background: C.bg }}>
        <p style={{ fontSize: 14, color: C.textSec, marginBottom: 16, lineHeight: 1.6 }}>¿De dónde viene esta receta?</p>
        {[{ id: 'photo', icon: 'camera', label: 'Foto de libro o pantalla', desc: 'Claude la extrae automáticamente' }, { id: 'manual', icon: 'pencil', label: 'Escribir manualmente', desc: 'Para recetas de memoria o simples' }, { id: 'instagram', icon: 'link', label: 'Instagram / TikTok', desc: 'Guarda autor y plataforma' }, { id: 'youtube', icon: 'link', label: 'YouTube', desc: 'Receta en video' }, { id: 'libro', icon: 'book', label: 'Libro o revista', desc: 'Foto de la página' }].map(o => (
          <div key={o.id} onClick={() => { if (o.id === 'photo' || o.id === 'libro') { upd('source_type', o.id); fileRef.current?.click() } else { upd('source_type', o.id); setFlow('form') } }} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={o.icon} size={20} color={C.green} /></div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: C.text, margin: 0, fontFamily: serif }}>{o.label}</p>
              <p style={{ fontSize: 12, color: C.textMuted, margin: '3px 0 0' }}>{o.desc}</p>
            </div>
            <Icon name="back" size={16} color={C.border} style={{ transform: 'rotate(180deg)' }} />
          </div>
        ))}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoExtract} />
      </div>
    </div>
  )
  if (flow === 'ext') return (
    <div style={{ ...S.screen, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, background: C.bg }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={32} color={C.green} /></div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: serif, margin: 0 }}>Analizando la foto...</h2>
      <p style={{ fontSize: 14, color: C.textSec, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>Claude está extrayendo ingredientes y pasos.</p>
    </div>
  )
  return (
    <div style={S.screen}>
      <div style={{ ...S.header, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={onBack}><Icon name="back" size={22} color={C.text} /></button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: serif, flex: 1 }}>{initial ? 'Editar receta' : 'Nueva receta'}</h2>
        <button onClick={save} disabled={saving} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 12, padding: '9px 20px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : onSaveLabel}</button>
      </div>
      <div style={{ ...S.scroll, background: C.bg }}>
        <div style={{ padding: '16px 20px', background: C.surface, marginBottom: 8 }}>
          {err && <div style={{ background: C.amberBg, color: C.amber, borderRadius: 12, padding: '10px 14px', fontSize: 14, marginBottom: 14 }}>{err}</div>}
          {photoPreview ? (
            <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', height: 180, position: 'relative' }}>
              <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Foto" />
              <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); upd('photo_url', null) }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(44,36,22,.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={16} color="#fff" /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '18px', borderRadius: 16, border: `1.5px dashed ${C.border}`, background: C.greenBg, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.green, fontSize: 14, fontWeight: 500 }}><Icon name="camera" size={20} color={C.green} />Agregar foto</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleManualPhoto} />
          <span style={S.label}>Nombre *</span>
          <input style={{ ...S.input, marginBottom: 12, fontFamily: serif, fontSize: 17, fontWeight: 600 }} type="text" value={f.title} onChange={e => upd('title', e.target.value)} placeholder="Ej. Salmón al limón" />
          <span style={S.label}>Descripción breve</span>
          <input style={{ ...S.input, marginBottom: 12 }} type="text" value={f.description} onChange={e => upd('description', e.target.value)} placeholder="Ej. Proteína perfecta para la comida" />
          <span style={S.label}>Fuente / Autor</span>
          <input style={{ ...S.input, marginBottom: 14 }} type="text" value={f.source_author} onChange={e => upd('source_author', e.target.value)} placeholder="@cuenta, Abuela Carmen, Libro..." />
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['servings', 'Porciones'], ['prep_time', 'Prep min'], ['cook_time', 'Cocción min']].map(([k, l]) => (
              <div key={k} style={{ flex: 1 }}><span style={S.label}>{l}</span><input style={S.input} type="number" min="0" value={f[k]} onChange={e => upd(k, parseInt(e.target.value) || '')} /></div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.bg, borderRadius: 12, border: `0.5px solid ${C.border}` }}>
            <input type="checkbox" id="simp" checked={f.is_simple} onChange={e => upd('is_simple', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.green }} />
            <label htmlFor="simp" style={{ fontSize: 14, color: C.text, cursor: 'pointer' }}>Platillo sin receta (todos saben cómo)</label>
          </div>
        </div>
        <div style={{ padding: '16px 20px', background: C.surface, marginBottom: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: serif }}>Categorías</p>
          {[{ label: 'Momento del día', k: 'moment_tags', opts: MTAGS, abg: t => MT[t]?.bg || C.greenBg, atx: t => MT[t]?.tx || C.greenDark }, { label: 'Tipo de platillo', k: 'category_tags', opts: CTAGS, abg: () => C.greenBg, atx: () => C.greenDark }].map(sec => (
            <div key={sec.k} style={{ marginBottom: 16 }}>
              <span style={S.sec}>{sec.label}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{sec.opts.map(o => <Toggle key={o} label={o} active={f[sec.k].includes(o)} abg={sec.abg(o)} atx={sec.atx(o)} onClick={() => tog(sec.k, o)} />)}</div>
            </div>
          ))}
          <span style={S.sec}>¿Para quién?</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{ATAGS.map(o => <Toggle key={o} label={o} active={f.audience_tags.includes(o)} abg='#F0EDF8' atx='#4A3A7A' onClick={() => tog('audience_tags', o)} />)}</div>
          <span style={S.sec}>¿Qué tan sano?</span>
          <div style={{ display: 'flex', gap: 8 }}>{HTAGS.map(o => <Toggle key={o} label={o} active={f.health_tag === o} abg={HT[o]?.bg || C.greenBg} atx={HT[o]?.tx || C.greenDark} onClick={() => upd('health_tag', o)} />)}</div>
        </div>
        <div style={{ padding: '16px 20px', background: C.surface, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, fontFamily: serif }}>Ingredientes</p>
            <button onClick={addI} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Icon name="plus" size={14} color={C.green} />Agregar</button>
          </div>
          {f.ingredients.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <input style={{ ...S.input, flex: 2 }} type="text" value={g.n} onChange={e => updI(i, 'n', e.target.value)} placeholder="Ingrediente" />
              <input style={{ ...S.input, width: 52 }} type="text" value={g.q} onChange={e => updI(i, 'q', e.target.value)} placeholder="Cant." />
              <select style={{ ...S.input, flex: 1, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', paddingRight: 6 }} value={g.u || ''} onChange={e => updI(i, 'u', e.target.value)}>
                <option value="">-</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {f.ingredients.length > 1 && <button onClick={() => delI(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, padding: 4, flexShrink: 0 }}><Icon name="x" size={16} color={C.danger} /></button>}
            </div>
          ))}
        </div>
        {!f.is_simple && (
          <div style={{ padding: '16px 20px', background: C.surface, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, fontFamily: serif }}>Preparación</p>
              <button onClick={addS} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Icon name="plus" size={14} color={C.green} />Paso</button>
            </div>
            {f.steps.map((txt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 8, background: C.greenBg, color: C.greenDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
                <textarea value={txt} onChange={e => updS(i, e.target.value)} placeholder={`Paso ${i + 1}...`} rows={2} style={{ ...S.input, flex: 1, resize: 'none', lineHeight: 1.6 }} />
                {f.steps.length > 1 && <button onClick={() => delS(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger, padding: 4, flexShrink: 0, marginTop: 8 }}><Icon name="x" size={16} color={C.danger} /></button>}
              </div>
            ))}
          </div>
        )}
        <div style={{ padding: '16px 20px', background: C.surface, marginBottom: 8 }}>
          <span style={S.label}>Notas / tips</span>
          <textarea value={f.notes} onChange={e => upd('notes', e.target.value)} placeholder="Trucos, variaciones, notas..." rows={3} style={{ ...S.input, resize: 'none', lineHeight: 1.6 }} />
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────

export default function App() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [activeTab, setActiveTab] = useState('recipes')
  const [screen, setScreen] = useState('list')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)
  const [filters, setFilters] = useState({ mt: [], ct: [], at: [], ht: [] })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('alpha')

  useEffect(() => { fetchRecipes().then(setRecipes).catch(console.error).finally(() => setLoading(false)) }, [])

  const go = (s, d) => { if (d !== undefined) setSel(d); setScreen(s) }
  const handleSave = async (recipe) => { const saved = await insertRecipe(recipe); setRecipes(p => [saved, ...p]); go('list') }
  const handleUpdate = async (recipe) => { const updated = await updateRecipe(sel.id, recipe); setRecipes(p => p.map(r => r.id === sel.id ? updated : r)); setSel(updated); go('detail', updated) }
  const handleDelete = async () => { await deleteRecipe(sel.id); setRecipes(p => p.filter(r => r.id !== sel.id)); go('list') }
  const handleRate = async (rating) => { const updated = await updateRating(sel.id, rating); setRecipes(p => p.map(r => r.id === sel.id ? updated : r)); setSel(updated) }

  const hideBottomNav = ['add', 'edit', 'filter'].includes(screen) && activeTab === 'recipes'

  return (
    <div style={S.app}>
      {needRefresh && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: C.green, color: '#fff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: '0 -2px 12px rgba(0,0,0,.15)' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Nueva versión disponible</span>
          <button onClick={() => updateServiceWorker(true)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Actualizar</button>
        </div>
      )}

      {/* Main content */}
      {activeTab === 'refri' ? (
        <RefriScreen recipes={recipes} />
      ) : activeTab === 'planner' ? (
        <PlannerScreen recipes={recipes} />
      ) : (
        <>
          {screen === 'list' && <ListScreen recipes={recipes} loading={loading} onAdd={() => go('add')} onSel={r => go('detail', r)} filters={filters} setFilters={setFilters} search={search} setSearch={setSearch} onFilter={() => go('filter')} sort={sort} setSort={setSort} />}
          {screen === 'detail' && sel && <DetailScreen r={sel} onBack={() => go('list')} onEdit={() => go('edit', sel)} onDelete={handleDelete} onRate={handleRate} />}
          {screen === 'add' && <RecipeForm onBack={() => go('list')} onSave={handleSave} />}
          {screen === 'edit' && sel && <RecipeForm initial={sel} onBack={() => go('detail', sel)} onSave={handleUpdate} onSaveLabel="Actualizar" />}
          {screen === 'filter' && <FilterScreen filters={filters} setFilters={setFilters} onBack={() => go('list')} />}
        </>
      )}

      {/* Bottom tab bar */}
      {!hideBottomNav && (
        <div style={{ flexShrink: 0, background: C.surface, borderTop: `0.5px solid ${C.border}`, display: 'flex', zIndex: 30 }}>
          {[{ id: 'recipes', label: 'Recetas', icon: 'book' }, { id: 'planner', label: 'Planificar', icon: 'calendar' }, { id: 'refri', label: 'Refri', icon: 'fridge' }].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'recipes' && screen === 'list') {} }} style={{ flex: 1, padding: '10px 0 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Icon name={tab.icon} size={22} color={activeTab === tab.id ? C.green : C.textMuted} />
              <span style={{ fontSize: 10, fontWeight: 600, color: activeTab === tab.id ? C.green : C.textMuted, letterSpacing: '0.04em' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
