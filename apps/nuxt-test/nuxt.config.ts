import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  devServer: {
    https: {
      key: 'localhost-key.pem',
      cert: 'localhost.pem',
    },
  },

  vite: {
    plugins: [nodePolyfills()],
  },

  build: {
    transpile: [/@apillon[\\/]wallet-vue/],
  },

  runtimeConfig: {
    public: {
      CLIENT_ID: process.env.VITE_CLIENT_ID || 'YOUR INTEGRATION UUID HERE',
    },
  },
});
