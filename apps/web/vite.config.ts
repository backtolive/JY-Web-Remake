import { defineConfig } from 'vite';
import type { Connect } from 'vite';
import { readFile } from 'node:fs/promises';

const localWorld = new URL('../../assets/generated/world-preview/world-fa9af52a0d2428da.local.json', import.meta.url);
const localOriginalSlice = new URL('../../assets/generated/mvp/original-slice-2718220d5738c3ea.local.json', import.meta.url);
const serveLocalWorld: Connect.NextHandleFunction = (req, res, next) => {
  if (req.method !== 'GET' || !['/__local-world.json','/__local-original-slice.json'].includes(req.url ?? '')) return next();
  if (req.headers.host !== '127.0.0.1:4173' && req.headers.host !== '127.0.0.1:5173') {
    res.statusCode = 404;
    return res.end();
  }
  const source = req.url === '/__local-original-slice.json' ? localOriginalSlice : localWorld;
  void readFile(source).then(bytes => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(bytes);
  }, () => {
    res.statusCode = 404;
    res.end();
  });
};

export default defineConfig({
  base: './',
  plugins: [{ name: 'local-world-preview',
    configureServer(server) { server.middlewares.use(serveLocalWorld); },
    configurePreviewServer(server) { server.middlewares.use(serveLocalWorld); },
  }, { name: 'exclude-private-original-content',
    load(id) {
      const normalized=id.replaceAll('\\','/');
      if(['/original/','/assets/generated/','/references/'].some(segment=>normalized.includes(segment))) {
        throw new Error('Original/reference/generated content must be imported locally by players, never bundled.');
      }
      return null;
    },
  }],
  build: { outDir: 'dist', target: 'es2022',
    rollupOptions: { output: { manualChunks: { 'babylon': ['@babylonjs/core/Engines/engine', '@babylonjs/core/scene'],
      'react': ['react', 'react-dom/client'] } } } },
});
