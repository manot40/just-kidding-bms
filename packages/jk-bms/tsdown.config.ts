import { defineConfig } from 'tsdown';

export default defineConfig({
  hash: false,
  entry: ['./src/index.ts', './src/react.ts', './src/ble-native.ts', './src/ble-web.ts'],
  outDir: './dist',
});
