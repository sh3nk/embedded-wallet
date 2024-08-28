import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import abi from './abi.json';
import {
  abort,
  AuthData,
  AuthStrategyName,
  ContractWriteParams,
  getEmbeddedWallet,
  PlainTransactionParams,
  SignMessageParams,
} from '@apillon/wallet-sdk';
import { getProxyResponse as getProxyResponsePasskey } from './strategies/passkey';
import { ethers } from 'ethers';

const CONTRACT_ROCOCO_ADDRESS = '5GPBKgHopZS3tniuTMfPccr4QARh4uso2ej933Sx7RZrRbMH';

class EmbeddedWalletPolkadot {
  wsProvider = new WsProvider('wss://rpc.polkadot.io');
  api: ApiPromise;

  // @TODO Maybe not needed if auth is still on evm Oasis sapphire
  accountManagerContract: ContractPromise;

  async init() {
    this.api = await ApiPromise.create({ provider: this.wsProvider });
    this.accountManagerContract = new ContractPromise(this.api, abi, CONTRACT_ROCOCO_ADDRESS);
  }

  async signMessage(params: SignMessageParams) {
    /**
     * @TODO Check that `this.api` is set
     */

    const w = getEmbeddedWallet();

    if (!w) {
      throw abort('OASIS_WALLET_NOT_INITIALIZED');
    }

    if (!params.strategy) {
      params.strategy = w.lastAccount.authStrategy;
    }

    if (!params.authData) {
      if (params.strategy === 'passkey' && w.lastAccount.username) {
        params.authData = { username: w.lastAccount.username };
      } else {
        throw abort('AUTHENTICATION_DATA_NOT_PROVIDED');
      }
    }

    let data = params.data || '';
    const originalMessage = params.message;

    if (!data || params.mustConfirm) {
      if (typeof params.message === 'string' && !params.message.startsWith('0x')) {
        params.message = ethers.encodeBytes32String(params.message);
      }

      /**
       * @TODO Encode data
       */

      /**
       * Emits 'signatureRequest' if confirmation is needed.
       * Handle confirmation in UI part of app (call this method again w/o `mustConfirm`).
       */
      if (params.mustConfirm) {
        return await new Promise<string>((resolve, reject) => {
          w.events.emit('signatureRequest', {
            ...params,
            data,
            message: originalMessage,
            mustConfirm: false,
            resolve,
            reject,
          });
        });
      }
    }

    /**
     * Authenticate user and sign message
     */
    const res = await this.getProxyForStrategy(params.strategy, data, params.authData!);

    if (res) {
      /**
       * @TODO Decode result?
       */
      const signedMsg = res;

      if (params.resolve) {
        params.resolve(signedMsg.toString());
      }

      return signedMsg;
    }
  }

  async signPlainTransaction(params: PlainTransactionParams) {
    const w = getEmbeddedWallet();

    if (!w) {
      throw abort('OASIS_WALLET_NOT_INITIALIZED');
    }

    if (!params.strategy) {
      params.strategy = w.lastAccount.authStrategy;
    }

    if (!params.authData) {
      if (params.strategy === 'passkey' && w.lastAccount.username) {
        params.authData = { username: w.lastAccount.username };
      } else {
        throw abort('AUTHENTICATION_DATA_NOT_PROVIDED');
      }
    }

    /**
     * @TODO Might have to do some tx params validation
     */

    /**
     * Emit 'txApprove' if confirmation is needed.
     * Handle confirmation in UI part of app (call this method again w/o `mustConfirm`).
     */
    if (params.mustConfirm) {
      return await new Promise<{
        signedTxData: string;
        chainId?: number;
      }>((resolve, reject) => {
        w.events.emit('txApprove', {
          plain: { ...params, mustConfirm: false, resolve, reject },
        });
      });
    }

    /**
     * @TODO Encode data
     */
    const data = params.tx;

    const res = await this.getProxyForStrategy(params.strategy, data, params.authData);

    if (res) {
      /**
       * @TODO Decode result?
       */
      const signedTxData = res.toString();

      if (params.resolve) {
        params.resolve({
          signedTxData,
        });
      }

      return { signedTxData };
    }
  }

  /**
   * Send raw transaction data to network.
   * @TODO --
   */
  async broadcastTransaction() {}

  async signContractWrite(params: ContractWriteParams) {
    const w = getEmbeddedWallet();

    if (!w) {
      throw abort('OASIS_WALLET_NOT_INITIALIZED');
    }

    if (!params.strategy) {
      params.strategy = w.lastAccount.authStrategy;
    }

    if (!params.authData) {
      if (params.strategy === 'passkey' && w.lastAccount.username) {
        params.authData = { username: w.lastAccount.username };
      } else {
        throw abort('AUTHENTICATION_DATA_NOT_PROVIDED');
      }
    }

    /**
     * Emit 'txApprove' if confirmation is needed.
     * Handle confirmation in UI part of app (call this method again w/o `mustConfirm`).
     */
    if (params.mustConfirm) {
      return await new Promise<{
        signedTxData: string;
        chainId?: number;
      }>((resolve, reject) => {
        w.events.emit('txApprove', {
          contractWrite: { ...params, mustConfirm: false, resolve, reject },
        });
      });
    }

    /**
     * @TODO Get address for username
     */
    const address = '0xADDRESS_FOR_USERNAME';

    /**
     * @TODO prepare Tx data
     */
    const data = {};

    const res = await this.getProxyForStrategy(params.strategy, data, params.authData);

    if (res) {
      /**
       * @TODO Decode result?
       */
      const signedTxData = res.toString();

      if (params.resolve) {
        params.resolve({
          signedTxData,
        });
      }

      return { signedTxData };
    }
  }

  async getProxyForStrategy(strategy: AuthStrategyName, data: any, authData: AuthData) {
    if (!this.accountManagerContract) {
      throw abort('ACCOUNT_MANAGER_CONTRACT_NOT_INITIALIZED');
    }

    if (strategy === 'passkey') {
      return await getProxyResponsePasskey(this.accountManagerContract, data, authData);
    }
  }
}

export { EmbeddedWalletPolkadot };
export default EmbeddedWalletPolkadot;
