const { applyCors, handleOptions } = require('../lib/cors')
const { searchSymbols } = require('../lib/forexSymbols')

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return
  applyCors(res)

  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' })
    return
  }

  const q = String(req.query.q || '')
  const limit = Number(req.query.limit) || 50
  res.status(200).json(searchSymbols(q, limit))
}
