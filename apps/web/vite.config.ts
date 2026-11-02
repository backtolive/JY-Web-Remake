import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{ name: 'exclude-private-original-content',
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
