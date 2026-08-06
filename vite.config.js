import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // مسار نشر GitHub Pages (اسم الريبو). لازم يطابق الـ repo URL:
  // https://ai23ai24ai250-sys.github.io/seeing/ → base: '/seeing/'
  base: '/seeing/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
