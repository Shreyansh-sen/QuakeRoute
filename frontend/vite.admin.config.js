import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'admin-html-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve admin.html for all HTML requests
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/admin.html'
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@api': path.resolve(__dirname, './src/api'),
      '@user': path.resolve(__dirname, './src/user'),
      '@admin': path.resolve(__dirname, './src/admin'),
    },
  },
  root: '.',
  build: {
    outDir: 'dist/admin',
    rollupOptions: {
      input: path.resolve(__dirname, 'admin.html'),
    },
  },
  server: {
    port: 3001,
  },
  define: {
    'import.meta.env.VITE_APP_TYPE': JSON.stringify('admin'),
  },
})
