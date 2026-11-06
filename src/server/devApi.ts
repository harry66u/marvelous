import type { Connect, Plugin } from 'vite'
import { handleDay } from '../../api/day'

/** Serves the Vercel function at /api/day during `vite dev` and `vite preview`. */
function dayMiddleware(): Connect.NextHandleFunction {
  return (req, res) => {
    const path = req.originalUrl ?? req.url ?? '/api/day'
    const response = handleDay(new Request(`http://localhost${path}`))
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    void response.text().then((body) => res.end(body))
  }
}

export function devApi(): Plugin {
  return {
    name: 'marvelous-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/day', dayMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/day', dayMiddleware())
    },
  }
}
