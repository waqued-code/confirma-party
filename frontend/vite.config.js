import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'iOS >= 12', 'Safari >= 12'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  base: '/app/',
  build: {
    target: ['es2015', 'safari12', 'ios12']
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
