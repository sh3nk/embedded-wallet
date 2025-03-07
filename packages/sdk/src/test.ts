import { EmbeddedWalletSDK } from '../lib/utils.ts';

document.addEventListener('DOMContentLoaded', () => {
  EmbeddedWalletSDK({
    clientId: import.meta.env.VITE_CLIENT_ID ?? 'YOUR INTEGRATION UUID HERE',
    defaultNetworkId: 23295,
    networks: [
      {
        id: 1287,
        name: 'Moonbase Testnet',
        rpcUrl: 'https://rpc.testnet.moonbeam.network',
        explorerUrl: 'https://moonbase.moonscan.io',
      },
      {
        id: 44787,
        name: 'Celo Alfajores',
        rpcUrl: 'https://alfajores-forno.celo-testnet.org',
        explorerUrl: 'https://explorer.celo.org/alfajores',
      },
      {
        id: 80002,
        name: 'Polygon Amoy',
        rpcUrl: 'https://rpc-amoy.polygon.technology',
        explorerUrl: 'https://www.oklink.com/amoy',
      },
    ],
  });
});
