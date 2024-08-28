import { injectExtension } from '@polkadot/extension-inject';
import { Injected } from '@polkadot/extension-inject/types';

function injectPolkadotWallet() {
  injectExtension(
    async _origin => {
      const w = await getEmbeddedWalletRetry();
      const embeddedProvider = getProvider();

      if (!w) {
        throw abort('OASIS_WALLET_NOT_INITIALIZED');
      }

      const accounts: Injected['accounts'] = {
        get: async () => {
          let address = '';
          if (w.lastAccount.address) {
            address = w.lastAccount.address;
          } else {
            address = await w.waitForAccount();
          }

          return [
            {
              address,
              /**
               * @TODO
               */
              // type KeypairType = 'ed25519' | 'sr25519' | 'ecdsa' | 'ethereum'
              // type: '',
            },
          ];
        },

        /**
         * Call `cb` when new accounts become available
         */
        subscribe: cb => {
          const handler = (newAccounts: string[]) => {
            cb(newAccounts.map(x => ({ address: x })));
          };

          w.events.on('accountsChanged', handler);

          return () => w.events.off('accountsChanged', handler);
        },
      };

      const signer: Injected['signer'] = {
        /**
         * @description signs an extrinsic payload from a serialized form
         */
        // signPayload?: (payload: SignerPayloadJSON) => Promise<SignerResult>;

        /**
         * @description signs a raw payload, only the bytes data as supplied
         */
        signRaw: async raw => {
          if (raw.type === 'bytes') {
            const res = await w.signMessage({
              message: raw.data,
            });

            if (!res) {
              throw abort('CANT_GET_SIGNATURE');
            }

            return {
              id: 0,
              signature: res as `0x${string}`,
            };
          } else {
            const res = await w.signPlainTransaction({
              tx: raw.data as any,
            });

            if (!res) {
              throw abort('CANT_GET_SIGNATURE');
            }

            return {
              id: 0,
              signature: res?.signedTxData,
              signedTransaction: res?.signedTxData,
            };
          }
        },

        /**
         * @description Receives an update for the extrinsic signed by a `signer.sign`
         */
        // update?: (id: number, status: H256 | ISubmittableResult) => void;
      };

      return {
        accounts,
        // metadata?: InjectedMetadata;
        // provider,
        signer,
      };
    },
    { name: 'embeddedWallet', version: '0.0.1' }
  );
}

export { injectPolkadotWallet };
export default injectPolkadotWallet;
