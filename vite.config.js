import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const offlineShell = () => ({
  name: 'offline-shell',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const files = Object.keys(bundle).filter((name) => !name.endsWith('.map'));
    const shell = [...new Set(['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', ...files])].map((name) => `./${name}`);
    const template = readFileSync(new URL('./src/offline/service-worker.js', import.meta.url), 'utf8');
    const hash = createHash('sha256').update(template + JSON.stringify(shell));
    for (const item of Object.values(bundle)) hash.update(item.type === 'chunk' ? item.code : item.source);
    for (const file of ['index.html', 'public/manifest.webmanifest', 'public/icon.svg', 'public/icon-192.png', 'public/icon-512.png']) hash.update(readFileSync(new URL(file, import.meta.url)));
    const version = hash.digest('hex').slice(0, 12);
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: template.replace('__CACHE_VERSION__', version).replace('__PRECACHE__', JSON.stringify(shell)) });
  }
});

export default defineConfig({
  plugins: [react(), offlineShell()],
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.jsx'],
    environment: 'node',
    environmentMatchGlobs: [['tests/integration/**', 'jsdom']],
    setupFiles: './src/test/setup.js',
    css: true,
    globals: true,
    testTimeout: 15000,
    maxWorkers: 2,
    minWorkers: 1
  }
});
