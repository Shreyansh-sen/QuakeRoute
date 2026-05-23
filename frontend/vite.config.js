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
  server: {
    port: 3000,
  },
})
