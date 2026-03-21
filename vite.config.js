import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Production build: set VITE_API_BASE (e.g. https://api.example.com/api) in .env.production
// Dev: leave unset so relative /api is proxied to Spring Boot below.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
