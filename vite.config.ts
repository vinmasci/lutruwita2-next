import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },
  base: '/',
  appType: 'spa',
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {}
      }
    },
    // Skip type checking during build when SKIP_TYPESCRIPT is true
    minify: true,
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    tsconfigRaw: {
      compilerOptions: {
        jsx: 'react-jsx'
      }
    }
  },
  optimizeDeps: {
    include: ['@auth0/auth0-react']
  }
})
