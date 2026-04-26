import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  base: './',
  root: resolve('src'),
  resolve: {
    alias: {
      '@': resolve('src'),
      '@renderer': resolve('src'),
      '@i18n': resolve('src/i18n')
    }
  },
  plugins: [
    vue(),
    viteCompression(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  publicDir: resolve('public'),
  server: {
    host: '0.0.0.0'
  },
  build: {
    outDir: resolve('dist'),
    assetsDir: 'assets'
  }
});
