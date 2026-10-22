import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import preact from '@preact/preset-vite'

// serves the vercel functions from ./api inside the dev server, so local dev needs no vercel cli
const localApi = (): Plugin => ({
  name: 'local-api',
  configureServer (server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
      const name = /^\/api\/([\w-]+)$/.exec(url.pathname)?.[1]
      const file = name === undefined ? null : resolve('api', `${name}.ts`)

      if (file === null || !existsSync(file)) {
        next()

        return
      }

      try {
        const module = await server.ssrLoadModule(file)
        const handler = module[req.method ?? 'GET']

        if (typeof handler !== 'function') {
          res.statusCode = 405
          res.end()

          return
        }

        const response = await handler(new Request(url, { method: req.method })) as Response

        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (error) {
        next(error)
      }
    })
  }
})

export default defineConfig(({ mode }) => {
  // the functions read their secrets from process.env, the same way they do on vercel
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    process.env[key] ??= value
  }

  return {
    plugins: [preact(), localApi()],
    define: {
      __BUILD_DATE__: JSON.stringify(new Date().toISOString())
    }
  }
})
