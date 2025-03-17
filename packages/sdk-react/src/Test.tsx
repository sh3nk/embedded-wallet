import { networks } from '@apillon/wallet-networks';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { EmbeddedWallet } from '../lib/EmbeddedWallet';
import { useAccount } from '../lib/main';

export function Test() {
  const { info } = useAccount();

  return (
    <>
      <div>
        <EmbeddedWallet
          clientId="YOUR INTEGRATION UUID HERE"
          defaultNetworkId={1287}
          networks={networks}
        />

        <p>username: {info.username}</p>

        <p>address: {JSON.stringify(info.activeWallet)}</p>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Test />
  </React.StrictMode>
);
