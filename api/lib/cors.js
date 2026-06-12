function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(res)
    res.status(200).end()
    return true
  }
  return false
}

module.exports = { applyCors, handleOptions }
