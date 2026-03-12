import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.ts'
      },
      preload: {
        input: {
          preload: resolve(__dirname, 'electron/preload.ts')
        }
      }
    })
  ]
});
