import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Proxy configuration has been removed to use serverless functions directly
  server: {
    fs: {
      // Allow access to necessary directories
      allow: ['src', 'public', 'node_modules', 'api']
    }
  },
  base: '/',
  appType: 'spa',
  resolve: {
    alias: {
      '@': '/src'
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {}
      },
      // Exclude API directory from the build process
      external: [
        /^api\//,
        'mongoose',
        'mongodb'
      ]
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
    include: ['@auth0/auth0-react'],
    exclude: ['api', 'mongoose', 'mongodb']
  }
})
