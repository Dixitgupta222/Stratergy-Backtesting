const { applyCors, handleOptions } = require('../lib/cors')
const { searchSymbols } = require('../lib/indiaSymbols')

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return
  applyCors(res)

  if (req.method !== 'GET') {
    res.status(405).json({ detail: 'Method not allowed' })
    return
  }

  res.status(200).json({ ok: true, symbols: searchSymbols('', 1000).length })
}
