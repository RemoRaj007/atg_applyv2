import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const serveAtgIndex = (): Plugin => ({
  name: 'serve-atg-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/' || req.url === '/index.html') {
        req.url = '/atg_index.html'
      }
      next()
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveAtgIndex()],
  build: {
    rollupOptions: {
      input: 'atg_index.html'
    }
  }
})

