import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/mydictionary/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '私辞典',
        short_name: '私辞典',
        description: '気になった言葉を拾い、育て、偶然また開く個人辞典',
        lang: 'ja',
        start_url: '/mydictionary/',
        scope: '/mydictionary/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f3efe3',
        theme_color: '#2e2c28',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/mydictionary/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
