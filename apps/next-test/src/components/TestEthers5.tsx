import { useWallet } from '@apillon/wallet-react';
import { EmbeddedEthersSigner } from '@apillon/wallet-sdk';
import { ethers } from 'ethers5';

export default function TestEthers5() {
  const { wallet } = useWallet();

  if (!wallet) {
    return;
  }

  const signer = new EmbeddedEthersSigner(wallet.getRpcProviderForChainId(1287));

  const contract = new ethers.Contract(
    '0x67b9DA16d0Adf2dF05F0564c081379479d0448f8',
    [
      'function claim() public',
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) public returns (bool)',
    ],
    signer as any
  );

  return (
    <div
      style={{
        display: 'grid',
        gap: '8px',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      }}
    >
      <button
        onClick={async () => {
          console.log(await signer.signMessage('test massage'));
        }}
      >
        (ethers 5) Sign message
      </button>

      <button
        onClick={async () => {
          console.log(await signer.provider.getBalance(await signer.getAddress()));
        }}
      >
        (ethers 5) Get native balance
      </button>

      <button
        onClick={async () => {
          const res = await signer.sendTransaction({
            to: '0x700cebAA997ecAd7B0797f8f359C621604Cce6Bf',
            value: ethers.utils.parseUnits('0.01', 18).toBigInt(),
          });
          console.log(res);
        }}
      >
        (ethers 5) Transfer native balance
      </button>

      <button
        onClick={async () => {
          console.log((await contract.balanceOf(await signer.getAddress())).toString());
        }}
      >
        (ethers 5) Contract read (balanceOf)
      </button>

      <button
        onClick={async () => {
          console.log(await contract.claim());
        }}
      >
        (ethers 5) Contract write (claim)
      </button>

      <button
        onClick={async () => {
          const txHash = await contract.transfer(
            '0x700cebAA997ecAd7B0797f8f359C621604Cce6Bf',
            ethers.utils.parseUnits('0.01', 18)
          );

          console.log(txHash);
        }}
      >
        (ethers5) Contract write (transfer)
      </button>
    </div>
  );
}