import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { URL, pathToFileURL } from 'url'
import fs from 'fs'

// Vite plugin to execute Vercel serverless /api endpoints in local dev
function apiDevPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) {
          return next()
        }

        const urlPath = req.url.split('?')[0]
        const absolutePath = path.resolve(process.cwd(), '.' + urlPath + '.js')
        const altAbsolutePath = path.resolve(process.cwd(), '.' + urlPath + '/index.js')

        let targetFile = null
        if (fs.existsSync(absolutePath)) {
          targetFile = absolutePath
        } else if (fs.existsSync(altAbsolutePath)) {
          targetFile = altAbsolutePath
        }

        let handlerModule = null
        if (targetFile) {
          try {
            const fileUrl = pathToFileURL(targetFile).href
            handlerModule = await import(/* @vite-ignore */ `${fileUrl}?t=${Date.now()}`)
          } catch (e) {
            console.error(`Failed to load handler for ${req.url}:`, e)
          }
        }

        if (!handlerModule || typeof handlerModule.default !== 'function') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `API route ${req.url} not found` }))
          return
        }

        // Parse JSON body for mutation requests
        let body = null
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const buffers = []
          for await (const chunk of req) {
            buffers.push(chunk)
          }
          const raw = Buffer.concat(buffers).toString('utf8')
          if (raw) {
            try {
              body = JSON.parse(raw)
            } catch (err) {
              body = {}
            }
          }
        }
        req.body = body || {}

        // Parse query params
        const urlObj = new URL(req.url, 'http://localhost:3000')
        req.query = Object.fromEntries(urlObj.searchParams.entries())

        // Polyfill res.status and res.json for Express/Vercel serverless compatibility
        res.status = function (code) {
          this.statusCode = code
          return this
        }
        res.json = function (data) {
          this.setHeader('Content-Type', 'application/json')
          this.end(JSON.stringify(data))
          return this
        }

        try {
          await handlerModule.default(req, res)
        } catch (handlerErr) {
          console.error(`API route ${req.url} error:`, handlerErr)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: handlerErr.message || 'Internal server error' }))
          }
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all environment variables (including serverless backend variables without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), apiDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  }
})

