import { createContext, useContext, useReducer } from 'react';
import { useWalletContext } from './wallet.context';
import { abort, AuthStrategyName, getHashedUsername } from '@apillon/wallet-sdk';
import { WebStorageKeys } from '../lib/constants';

export type AuthScreens =
  | 'loginForm'
  | 'captcha'
  | 'confirmCode'
  | 'codeSubmitted'
  | 'configuringPasskey';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState());

  const {
    wallet,
    handleError,
    state: { appProps, username: loggedInUsername },
    dispatch: dispatchWallet,
    loadAccountWallets,
    parseAccountWallets,
  } = useWalletContext();

  function setStateValue<T extends keyof ReturnType<typeof initialState>>(
    key: T,
    value: ReturnType<typeof initialState>[T]
  ) {
    dispatch({ type: 'setValue', payload: { key, value } });
  }

  /**
   * @param onlyLogin Just check that user has logged in, don't try to register if login fails.
   * @returns `true` if login is successful
   */
  async function onAuth(onlyLogin = false, ev?: React.FormEvent<HTMLFormElement>) {
    ev?.preventDefault();

    if (!state.username) {
      return;
    }

    setStateValue('loading', true);
    handleError();

    try {
      if (await wallet?.userExists(state.username)) {
        /**
         * Login
         */
        const address = await wallet?.authenticate('passkey', { username: state.username });

        if (address) {
          setupUserInfo({
            username: state.username,
            authStrategy: 'passkey',
          });

          return true;
        }
      } else if (!onlyLogin) {
        if (state.captcha) {
          if (await sendConfirmationEmail()) {
            onRegister();
          }
        } else {
          setStateValue('screen', 'captcha');
        }
      }
    } catch (e) {
      handleError(e, 'onAuth');
    }

    setStateValue('loading', false);
  }

  async function setupUserInfo({
    username,
    authStrategy,
  }: {
    username: string;
    authStrategy: AuthStrategyName;
  }) {
    dispatchWallet({
      type: 'setState',
      payload: {
        walletIndex: 0,
        username,
        authStrategy,
        // networkId: defaultNetworkId || undefined,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    if (wallet?.lastAccount.wallets) {
      parseAccountWallets(wallet?.lastAccount.wallets || []);
    }
  }

  async function sendConfirmationEmail(captchaToken?: string) {
    try {
      if (!captchaToken && !state.captcha) {
        throw new Error('Captcha verification required');
      }

      /**
       * Apillon email confirmation
       */
      const res = await fetch(
        `${import.meta.env.VITE_APILLON_BASE_URL ?? 'https://api.apillon.io'}/embedded-wallet/otp/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.username,
            captcha: {
              token: captchaToken || state.captcha,
              eKey: import.meta.env.VITE_PROCAPTCHA_KEY ?? 'N/A',
            },
          }),
        }
      );

      if (!res.ok || res.status >= 400) {
        throw new Error('Could not send confirmation email');
      }

      const { data } = await res.json();

      if (data?.expireTime) {
        const ts = new Date(data.expireTime).getTime() || 0;
        setStateValue('lastCodeExpiretime', ts);
        wallet?.xdomain?.storageSet(WebStorageKeys.OTP_EXPIRATION, `${ts}`, true);
      }

      return true;
    } catch (e) {
      handleError(e, 'sendConfirmationEmail');
    }
  }

  /**
   * Handle redirects (after email confimration code sent)
   */
  async function onRegister() {
    if (appProps.passkeyAuthMode === 'tab_form') {
      if (!wallet?.xdomain) {
        throw abort('XDOMAIN_NOT_INIT');
      }

      setStateValue('screen', 'configuringPasskey');

      const res = await wallet.xdomain.createViaTab(state.username);

      if (res && res.username) {
        await loadAccountWallets(res.authStrategy, res.username);
        setupUserInfo({ username: state.username, authStrategy: 'passkey' });
      }
    } else if (['redirect', 'tab_form'].includes(appProps.passkeyAuthMode || '')) {
      redirectToGateway(state.username);
    } else {
      setStateValue('screen', 'confirmCode');
    }
  }

  /**
   * Actually trigger SDK#register (after email code confirmed)
   */
  async function startRegister() {
    setStateValue('loading', true);
    handleError();

    try {
      let res: any;

      if (appProps.passkeyAuthMode === 'tab_form') {
        if (!wallet?.xdomain) {
          throw abort('XDOMAIN_NOT_INIT');
        }

        res = await wallet.xdomain.createViaTab(state.username);

        if (!res?.username) {
          throw new Error(`Couldn't authenticate account. Please try again.`);
        }

        await loadAccountWallets(res.authStrategy, res.username);
      } else {
        let hashed = state.hashedUsername;

        if (!hashed) {
          hashed = await getHashedUsername(state.username);
          setStateValue('hashedUsername', hashed);
        }

        res = await wallet?.register('passkey', { username: state.username }, hashed);
      }

      if (res) {
        setupUserInfo({ username: state.username, authStrategy: 'passkey' });
      }
    } catch (e) {
      handleError(e, 'startRegister');
    }

    setStateValue('loading', false);
  }

  function redirectToGateway(username?: string) {
    const gatewayUrl = import.meta.env.VITE_XDOMAIN_PASSKEY_SRC ?? 'https://passkey.apillon.io';

    if (!loggedInUsername && gatewayUrl) {
      window.location.href = `${gatewayUrl}?${[
        `ref=${encodeURIComponent(window.location.origin + window.location.pathname)}`,
        `clientId=${appProps.clientId || wallet?.apillonClientId || ''}`,
        `username=${encodeURIComponent(username || '')}`,
      ].join('&')}`;

      return true;
    }

    return false;
  }

  return (
    <AuthContext.Provider
      value={{
        state,
        dispatch,
        setStateValue,
        onAuth,
        onRegister,
        setupUserInfo,
        sendConfirmationEmail,
        startRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const AuthContext = createContext<
  | {
      state: ContextState;
      dispatch: (action: ContextActions) => void;
      setStateValue: <T extends keyof ReturnType<typeof initialState>>(
        key: T,
        value: ReturnType<typeof initialState>[T]
      ) => void;
      onAuth: (
        onlyLogin?: boolean,
        ev?: React.FormEvent<HTMLFormElement>
      ) => Promise<true | undefined>;
      onRegister: () => void;
      setupUserInfo: (params: {
        username: string;
        authStrategy: AuthStrategyName;
      }) => Promise<void>;
      sendConfirmationEmail: (captchaToken?: string) => Promise<true | undefined>;
      startRegister: () => void;
    }
  | undefined
>(undefined);

const initialState = () => ({
  loading: false,
  username: '',
  hashedUsername: undefined as Buffer | undefined,
  screen: 'loginForm' as AuthScreens,
  lastCodeExpiretime: 0, // get from /otp/generate and check before /otp/validate
  captcha: '',
});

type ContextState = ReturnType<typeof initialState>;

type ContextActions =
  | {
      type: 'setState';
      payload: Partial<ReturnType<typeof initialState>>;
    }
  | {
      type: 'setValue';
      payload: { key: keyof ReturnType<typeof initialState>; value: any };
    };

function reducer(state: ContextState, action: ContextActions) {
  switch (action.type) {
    case 'setState':
      return {
        ...state,
        ...action.payload,
      };
    case 'setValue':
      if (action.payload.key === 'username') {
        return {
          ...state,
          [action.payload.key]: action.payload.value,
          hashedUsername: undefined,
        };
      }

      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    default:
      throw new Error('Unhandled action type.' + JSON.stringify(action));
  }
}

function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext usage must be wrapped with TokensContext provider.');
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuthContext };
