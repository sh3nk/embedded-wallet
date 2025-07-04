import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import fs from 'fs';
import mkcert from 'vite-plugin-mkcert';

function addStyles() {
  return {
    name: 'add-styles',
    writeBundle(options: any, bundle: { [fileName: string]: any }) {
      if (bundle?.['react.js']) {
        const data = fs.readFileSync('./dist/react.js', { encoding: 'utf8' });
        fs.writeFileSync('./dist/react.js', `import './react.css';\n` + data);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
    react(),
    dts({
      include: ['lib'],
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
      rollupTypes: true,
    }),
    addStyles(),
    mkcert(),
  ],

  build: {
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      name: 'EmbeddedWalletReact',
      fileName: 'react',
    },

    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        // '@headlessui/react',
        '@noble/curves',
        // '@oasisprotocol/sapphire-paratime',
        'abitype',
        // 'asn1js',
        // 'cbor-redux',
        'ecdsa-secp256r1',
        'elliptic',
        'ethers6',
        // 'mitt',
        // 'pbkdf2',
        // 'react-qr-code',
        // 'secp256r1',
        'viem',
        '@polkadot/api',
      ],
    },
    target: 'esnext',
  },
});
