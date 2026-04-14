import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import flowbiteReact from "flowbite-react/plugin/vite";

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    flowbiteReact()
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@features': '/src/features',
      '@api': '/src/api',
      '@store': '/src/store',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@assets': '/src/assets',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
    hmr: {
      overlay: true
    }
  }
})