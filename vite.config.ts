import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate', 
      manifest: { 
        name: 'Bitogram Web App', 
        short_name: 'Bitogram Web', 
        start_url: '/', 
        display: 'standalone',
        theme_color: '#101417',
        background_color: '#101417',
        icons: [{ 
          src: '/logo-icon-192.png', 
          sizes: '192x192', 
          type: 'image/png' 
        }, { 
          src: '/logo-icon-512.png', 
          sizes: '512x512', 
          type: 'image/png' 
        }] 
      } 
    })
  ],
  resolve: {
    alias: {
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@components": path.resolve(__dirname, "./src/components"),
    }
  },
})
