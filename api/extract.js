export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { image, mimeType } = req.body
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: 'Extrae info de receta. Responde SOLO JSON: {"title":"","description":"","ingredients":[{"n":"","q":"","u":""}],"steps":[""],"servings":2,"prep_time":0,"cook_time":0,"source_author":"","moment_tags":[],"category_tags":[],"health_tag":"balanceado"}. moment_tags: desayuno|comida|cena|botana. category_tags: plato fuerte|verdura|sopa|acompanamiento|fruta|postre. health_tag: sano|balanceado|indulgente.', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: image } }, { type: 'text', text: 'Extrae la receta.' }] }] })
    })
    const data = await response.json()
    const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim())
    res.status(200).json(parsed)
  } catch (e) { res.status(500).json({ error: e.message }) }
}
