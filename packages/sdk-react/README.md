# Embedded Wallet React helpers

Collection of React hooks to help with embedded wallet implementation.

## Component `<EmbeddedWallet />`

Initialize wallet SDK and UI.

```tsx
import { EmbeddedWallet } from '@apillon/wallet-react';

return <EmbeddedWallet ...props />;
```

## Hooks

### useWallet

Get the initialized instance of embedded wallet.

Also exposes the most common wallet actions.

```ts
import { useWallet } from '@apillon/wallet-react';

const { wallet, signMessage, sendTransaction } = useWallet();

console.log(await wallet.userExists('johndoe'));
```

### useAccount

Get current connected account info.

```ts
import { useAccount } from '@apillon/wallet-react';

const { info, getBalance } = useAccount();
```

### useContract

Helper methods to interact with contracts.

```ts
import { useContract } from '@apillon/wallet-react';

const { read, write } = useContract({
  abi: ERC20Abi,
  address: '0xb1058eD01451B947A836dA3609f88C91804D0663',
});

console.log(await read('balanceOf', [address]));

const txHash = await write(
  'transfer',
  ['0x700cebAA997ecAd7B0797f8f359C621604Cce6Bf', '10000000'],
  'React Transfer'
);
```

### usePolkadot

Helpers for interacting with polkadot API.

```ts
import { usePolkadot } from '@apillon/wallet-react';

const { polkadotApi, sendTransaction } = usePolkadot();

sendTransaction(polkadotApi.tx.balances.transferAllowDeath(...));
```
