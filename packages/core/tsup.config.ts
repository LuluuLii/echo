import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'models/index.ts', 'agents/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
