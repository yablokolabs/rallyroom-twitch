import { defineConfig } from 'vite';
export default defineConfig({
  root: 'apps/web', publicDir: '../../assets',
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
