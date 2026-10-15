import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}


// Only browser Firebase configuration is emitted. Never expose server secrets here.
function firebaseWorkerConfig() {
  let source = ''
  return {
    name: 'firebase-worker-config',
    configResolved(config) {
      const env = { ...loadEnv(config.mode, config.root, 'VITE_FIREBASE_'), ...process.env }
      const fields = {"apiKey": "API_KEY", "authDomain": "AUTH_DOMAIN", "projectId": "PROJECT_ID", "storageBucket": "STORAGE_BUCKET", "messagingSenderId": "MESSAGING_SENDER_ID", "appId": "APP_ID", "measurementId": "MEASUREMENT_ID"}
      const browserConfig = Object.fromEntries(Object.entries(fields).map(([field, key]) => [field, env['VITE_FIREBASE_' + key] || '']))
      source = 'self.FIREBASE_CONFIG = ' + JSON.stringify(browserConfig) + ';\n'
    },
    configureServer(server) {
      server.middlewares.use('/firebase-config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-store'); res.end(source)
      })
    },
    generateBundle() { this.emitFile({type: 'asset', fileName: 'firebase-config.js', source}) },
  }
}

export default defineConfig({
  build: {
    rollupOptions: { input: { intro: path.resolve(__dirname, 'index.html'), app: path.resolve(__dirname, 'app.html') } },
  },
  server: {
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
  plugins: [
    figmaAssetResolver(),
    firebaseWorkerConfig(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
