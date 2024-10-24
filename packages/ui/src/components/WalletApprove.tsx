import { ethers } from 'ethers';
import { ContractReadParams } from '@apillon/wallet-sdk';
import Btn from './Btn';
import { useState } from 'react';
import { useWalletContext } from '../contexts/wallet.context';
import WalletError from './WalletError';

export type DisplayedContractParams = Pick<
  ContractReadParams,
  'chainId' | 'contractAddress' | 'contractFunctionName' | 'contractFunctionValues'
>;

export default function WalletApprove({
  tx,
  signMessage,
  contractFunctionData,
  approveText = 'Approve',
  declineText = 'Reject',
  onApprove,
  onDecline,
}: {
  tx?: ethers.TransactionLike<ethers.AddressLike>;
  signMessage?: string;
  contractFunctionData?: DisplayedContractParams;
  approveText?: string;
  declineText?: string;
  loading?: boolean;
  onApprove: () => Promise<void>;
  onDecline: () => void;
}) {
  const { networksById, wallet, dispatch } = useWalletContext();

  const [loading, setLoading] = useState(false);

  const preClass = 'bg-offwhite/25 p-3 whitespace-pre-wrap break-all rounded-sm mt-2';

  return (
    <div className="mt-2">
      {/* Sign Message */}
      {!!signMessage && (
        <div>
          <h2 className="mb-6">Sign Message</h2>

          <p className="break-all">
            You are signing:
            <br />
            {signMessage}
          </p>
        </div>
      )}

      {/* Approve plain TX */}
      {!!tx && (
        <div>
          <h2 className="mb-6">Approve Transaction</h2>

          {Object.entries(tx).map(([k, v]) => (
            <div key={k} className="mb-2 break-all">
              <p className="font-bold text-sm">{k}</p>

              <div
                style={{ maxHeight: '220px' }}
                className="overflow-auto pr-8 -mr-8 sm:pr-12 sm:-mr-12"
              >
                {typeof v === 'bigint' ? (
                  v.toString()
                ) : typeof v === 'object' ? (
                  <pre className={preClass}>
                    {JSON.stringify(
                      tx,
                      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
                      2
                    )}
                  </pre>
                ) : (
                  v
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve contract TX */}
      {!!contractFunctionData && (
        <div>
          <h2 className="mb-6">Approve Contract Transaction</h2>

          {!!contractFunctionData.chainId && !!networksById[contractFunctionData.chainId] && (
            <div>
              <p className="font-bold text-sm">Chain</p>
              {networksById[contractFunctionData.chainId].name}
            </div>
          )}

          <div className="mb-3 break-all">
            <p className="font-bold text-sm">Contract address</p>
            {contractFunctionData.contractAddress}
          </div>

          <div className="mb-3 break-all">
            <p className="font-bold text-sm">Contract function</p>
            {contractFunctionData.contractFunctionName}
          </div>

          {!!contractFunctionData.contractFunctionValues &&
            !!contractFunctionData.contractFunctionValues.length && (
              <div className="break-all">
                <p className="font-bold text-sm">Contract function values</p>

                <pre className={preClass}>
                  {JSON.stringify(
                    contractFunctionData.contractFunctionValues,
                    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
                    2
                  )}
                </pre>
              </div>
            )}
        </div>
      )}

      {/* Error */}
      <WalletError show className="mt-6 -mb-6" />

      <div className="mt-12 flex gap-4">
        <Btn
          loading={loading}
          className="w-full"
          onClick={async () => {
            setLoading(true);
            await onApprove();
            setLoading(false);
          }}
        >
          {approveText}
        </Btn>

        <Btn variant="secondary" disabled={loading} className="w-full" onClick={onDecline}>
          {declineText}
        </Btn>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            wallet?.setAccount({
              username: '',
              address: '',
              contractAddress: '',
              strategy: 'passkey',
            });

            dispatch({
              type: 'setState',
              payload: {
                username: '',
                address: '',
                contractAddress: '',
                balance: '',
                authStrategy: 'passkey',
              },
            });
          }}
        >
          Use another account
        </button>
      </div>
    </div>
  );
}
