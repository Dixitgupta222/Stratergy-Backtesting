import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))

const ROUTES = {
  '/api/forex/symbols': 'api/forex/symbols.js',
  '/api/forex/history': 'api/forex/history.js',
  '/api/forex/quotes': 'api/forex/quotes.js'
}

function createMockRes(res) {
  const state = { statusCode: 200, headers: {} }
  return {
    status(code) {
      state.statusCode = code
      return this
    },
    setHeader(key, value) {
      state.headers[key] = value
      return this
    },
    json(body) {
      for (const [k, v] of Object.entries(state.headers)) res.setHeader(k, v)
      res.statusCode = state.statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    },
    end(data = '') {
      for (const [k, v] of Object.entries(state.headers)) res.setHeader(k, v)
      res.statusCode = state.statusCode
      res.end(data)
    }
  }
}

/** Serve /api/forex/* in dev via local serverless handlers (no Python restart needed). */
export function forexApiDevPlugin() {
  return {
    name: 'forex-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const rel = ROUTES[url.pathname]
        if (!rel) return next()

        try {
          const full = path.join(root, rel)
          delete require.cache[full]
          const handler = require(full)
          const query = Object.fromEntries(url.searchParams.entries())
          const mockReq = { method: req.method, query }
          const mockRes = createMockRes(res)
          await handler(mockReq, mockRes)
        } catch (err) {
          console.error('[forex-api]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ detail: err.message || 'Forex API error' }))
        }
      })
    }
  }
}
