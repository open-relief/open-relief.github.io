import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const explicitBase = process.env.VITE_BASE_PATH;
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase =
  explicitBase ??
  (repositoryName && !repositoryName.endsWith('.github.io') ? `/${repositoryName}/` : '/');

export default defineConfig({
  root: '.',
  base: pagesBase,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: { port: 8080 },
});