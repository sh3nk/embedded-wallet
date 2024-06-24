import { ReactNode, createContext, useContext, useEffect, useReducer, useState } from 'react';
import { AuthStrategyName, NetworkConfig } from '../../lib/types';
import { WebStorageKeys } from '../../lib/constants';
import OasisAppWallet from '../../lib';
import { initializeOnWindow } from '../../lib/utils';

export type Network = { name: string; id: number; rpcUrl: string; explorerUrl: string };

const initialState = (defaultNetworkId = 0) => ({
  username: '',
  address: '',
  contractAddress: '',
  balance: '',
  authStrategy: 'passkey' as AuthStrategyName,
  networkId: defaultNetworkId,
  walletScreen: 'main' as 'main' | 'networks' | 'transactions',
});

type ContextState = ReturnType<typeof initialState>;

/**
 * State actions/reducer
 */
type ContextActions =
  | {
      type: 'setValue';
      payload: { key: keyof ReturnType<typeof initialState>; value: any };
    }
  | {
      type: 'setState';
      payload: Partial<ReturnType<typeof initialState>>;
    }
  | { type: 'reset' };

function reducer(state: ContextState, action: ContextActions) {
  switch (action.type) {
    case 'setValue':
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    case 'setState':
      return {
        ...state,
        ...action.payload,
      };
    case 'reset':
      return initialState(state.networkId);
    default:
      throw new Error('Unhandled action type.' + JSON.stringify(action));
  }
}

const WalletContext = createContext<
  | {
      state: ContextState;
      dispatch: (action: ContextActions) => void;
      networks: Network[];
      networksById: { [networkId: number]: Network };
      defaultNetworkId: number;
      wallet?: OasisAppWallet;
      setWallet: (wallet: OasisAppWallet) => void;
      reloadUserBalance: (walletRef?: OasisAppWallet) => void;
    }
  | undefined
>(undefined);

function WalletProvider({
  children,
  networks = [],
  defaultNetworkId = 0,
  sapphireUrl,
  accountManagerAddress,
}: {
  children: ReactNode;
  networks?: Network[];
  defaultNetworkId?: number;
  sapphireUrl?: string;
  accountManagerAddress?: string;
}) {
  const [state, dispatch] = useReducer(reducer, initialState(defaultNetworkId));
  const [initialized, setInitialized] = useState(false);
  const [wallet, setWallet] = useState<OasisAppWallet>();

  /**
   * Store changed state to localStorage
   */
  useEffect(() => {
    if (initialized) {
      /**
       * Exclude some state variables from being saved
       */
      // const {
      //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //   address,
      //   ...save
      // } = state;

      localStorage.setItem(WebStorageKeys.WALLET_CONTEXT, JSON.stringify(state));
    }
  }, [state]);

  /**
   * Initialize state from localStorage
   */
  useEffect(() => {
    const stored = localStorage.getItem(WebStorageKeys.WALLET_CONTEXT);

    if (stored) {
      try {
        const restored = JSON.parse(stored);
        dispatch({ type: 'setState', payload: restored });
      } catch (e) {
        console.error('Cant parse global state localStorage', e);
      }
    }

    setTimeout(() => setInitialized(true), 10);
  }, []);

  /**
   * Initialize Oasis Wallet App SDK
   */
  useEffect(() => {
    if (initialized && !wallet) {
      let w = undefined as OasisAppWallet | undefined;

      if (networks && networks.length) {
        w = initializeOnWindow({
          sapphireUrl,
          accountManagerAddress,
          defaultNetworkId: state.networkId || defaultNetworkId,
          networkConfig: networks.reduce((acc, x) => {
            acc[x.id] = {
              rpcUrl: x.rpcUrl,
              explorerUrl: x.explorerUrl,
            };
            return acc;
          }, {} as NetworkConfig),
        });
      } else {
        w = initializeOnWindow();
      }

      if (w) {
        setWallet(w);
        reloadUserBalance(w);

        w.setAccount({
          username: state.username,
          strategy: state.authStrategy,
          address: state.address,
          contractAddress: state.contractAddress,
        });
      }
    }
  }, [networks, defaultNetworkId, initialized]);

  /**
   * Reload balance if user "logged in"
   */
  async function reloadUserBalance(walletRef?: OasisAppWallet) {
    const w = walletRef || wallet;

    if (w && state.address) {
      try {
        const balance = await w?.getAccountBalance(state.address);
        dispatch({ type: 'setValue', payload: { key: 'balance', value: balance } });
        console.log(
          'Native Oasis Sapphire balance:',
          await w.getAccountBalance(state.address, 23295)
        );
      } catch (e) {
        console.error('Reloading balance', e);
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        state,
        dispatch,
        networks,
        networksById: networks.reduce((acc, x) => {
          acc[x.id] = x;
          return acc;
        }, {} as { [networkId: number]: Network }),
        defaultNetworkId: defaultNetworkId || 0,
        wallet,
        setWallet,
        reloadUserBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

function useWalletContext() {
  const context = useContext(WalletContext);

  if (context === undefined) {
    throw new Error('useWalletContext usage must be wrapped with WalletContext provider.');
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { WalletProvider, useWalletContext };
