import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
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
    outDir: 'dist/user',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 3000,
  },
  define: {
    'import.meta.env.VITE_APP_TYPE': JSON.stringify('user'),
  },
})
