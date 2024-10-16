import { useEffect, useRef, useState } from 'react';
import { getEmbeddedWallet, AuthStrategyName } from '@apillon/wallet-sdk';
import { useWalletContext } from '../contexts/wallet.context';
import Btn from './Btn';
import { AppProps } from './WalletWidget';
import WalletError from './WalletError';

export default function WalletAuth({
  authFormPlaceholder = 'your e-mail@email.com',
}: Pick<AppProps, 'authFormPlaceholder'>) {
  const { dispatch, defaultNetworkId, handleError } = useWalletContext();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCodeScreen, setIsCodeScreen] = useState(false);
  const [isCodeSubmitted, setIsCodeSubmitted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  async function onAuth(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    if (!username) {
      return;
    }

    const wallet = getEmbeddedWallet();

    setLoading(true);
    handleError();

    try {
      if (await wallet?.userExists(username)) {
        /**
         * Login
         */
        const address = await wallet?.authenticate('passkey', { username });

        if (address) {
          setupUserInfo({
            username,
            address: address.publicAddress,
            authStrategy: 'passkey',
          });
        }
      } else {
        if (await sendConfirmationEmail()) {
          setIsCodeScreen(true);
        }
      }
    } catch (e) {
      handleError(e);
    }

    setLoading(false);
  }

  async function sendConfirmationEmail() {
    try {
      /**
       * Apillon email confirmation
       */
      const res = await fetch(
        `${import.meta.env.VITE_APILLON_BASE_URL ?? 'https://api.apillon.io'}/embedded-wallet/otp/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: username,
          }),
        }
      );

      if (!res.ok || res.status >= 400) {
        throw new Error('Could not send confirmation email');
      }

      return true;
    } catch (e) {
      handleError(e);
    }
  }

  async function startRegister() {
    setLoading(true);

    handleError();

    try {
      const wallet = getEmbeddedWallet();

      const res = await wallet?.register('passkey', { username });

      if (res) {
        setupUserInfo({ username, address: res.publicAddress, authStrategy: 'passkey' });
      }
    } catch (e) {
      handleError(e);
    }

    setLoading(false);
  }

  async function setupUserInfo({
    username,
    address,
    authStrategy,
  }: {
    username: string;
    address: string;
    authStrategy: AuthStrategyName;
  }) {
    const wallet = getEmbeddedWallet();

    const balance = (await wallet?.getAccountBalance(address)) || '0';

    dispatch({
      type: 'setState',
      payload: {
        address,
        username,
        balance,
        authStrategy,
        networkId: defaultNetworkId || undefined,
      },
    });
  }

  if (isCodeSubmitted) {
    return (
      <div className="text-center mt-2">
        <h2 className="mb-12">Email succesfully confirmed.</h2>

        <p className="text-xl mb-12">Passkey configuration will now start.</p>

        <Btn loading={loading} onClick={() => startRegister()}>
          Retry
        </Btn>

        <WalletError show className="mt-6" />
      </div>
    );
  }

  if (isCodeScreen) {
    return (
      <>
        <ConfirmEmail
          loading={loading}
          resendCooldown={resendCooldown}
          onConfirm={async code => {
            setLoading(true);
            handleError();

            try {
              /**
               * Code check
               */
              const { data } = await (
                await fetch(
                  `${import.meta.env.VITE_APILLON_BASE_URL ?? 'https://api.apillon.io'}/embedded-wallet/otp/validate`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: username,
                      code,
                    }),
                  }
                )
              ).json();

              if (!data) {
                throw new Error('Verification code is not valid.');
              }

              setIsCodeSubmitted(true);

              startRegister();
            } catch (e) {
              handleError(e);

              setLoading(false);
            }
          }}
          onSendAgain={async () => {
            setLoading(true);
            handleError();

            if (await sendConfirmationEmail()) {
              setResendCooldown(true);
              setTimeout(() => setResendCooldown(false), 30000);
            }

            setLoading(false);
          }}
        />

        <WalletError show className="mt-6" />
      </>
    );
  }

  return (
    <div>
      <h2 className="mb-6">Sign in or Sign up</h2>

      <form onSubmit={ev => onAuth(ev)}>
        <input
          type="email"
          placeholder={authFormPlaceholder}
          value={username}
          className="w-full mb-8"
          onChange={ev => setUsername(ev.target.value)}
        />

        <Btn type="submit" loading={loading} className="w-full">
          Continue
        </Btn>
      </form>

      <WalletError show className="mt-6" />
    </div>
  );
}

function ConfirmEmail({
  loading,
  resendCooldown,
  onConfirm,
  onSendAgain,
}: {
  loading: boolean;
  resendCooldown: boolean;
  onConfirm: (code: string) => void;
  onSendAgain: () => void;
}) {
  const [code, setCode] = useState('');

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (code.length === 6 && !/\s/.test(code)) {
      onConfirm(code);
    }
  }, [code]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const input = e.target;

    // if (/^[^\d]$/.test(input.value)) {
    //   input.value = '';
    //   return;
    // }

    const previousInput = inputRefs[index - 1];
    const nextInput = inputRefs[index + 1];

    const newCode = inputRefs.map((_, i) => code[i] || ' ');
    newCode[index] = input.value;
    setCode(newCode.join(''));

    input.select();

    if (input.value === '') {
      // If the value is deleted, select previous input, if exists
      if (previousInput?.current) {
        previousInput.current.focus();
      }
    } else if (nextInput?.current) {
      // Select next input on entry, if exists
      nextInput.current.select();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    const input = e.target as HTMLInputElement;
    const previousInput = inputRefs[index - 1];

    if ((e.key === 'Backspace' || e.key === 'Delete') && input.value === '') {
      e.preventDefault();

      setCode(prevCode => prevCode.slice(0, index) + ' ' + prevCode.slice(index + 1));

      if (previousInput?.current) {
        previousInput.current.focus();
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedCode = e.clipboardData.getData('text');

    if (pastedCode.length === 6) {
      setCode(pastedCode);

      inputRefs.forEach((inputRef, index) => {
        if (inputRef?.current) {
          inputRef.current.value = pastedCode.charAt(index);
        }
      });
    }
  }

  return (
    <div className="text-center">
      <p>
        We just sent a confirmation code to your email. Paste the code below to proceed with account
        creation.
      </p>

      <h2 className="my-6">Check your email</h2>

      <p className="mb-6">Enter the 6-digit code you received</p>

      <div className="flex gap-2 mb-12 justify-center">
        {[0, 1, 2, 3, 4, 5].map(x => (
          <input
            ref={inputRefs[x]}
            key={x}
            type="text"
            maxLength={1}
            autoFocus={x === 0}
            disabled={loading}
            className="min-w-0 w-14 h-14"
            onFocus={ev => ev.target.select()}
            onKeyDown={ev => handleKeyDown(ev, x)}
            onPaste={ev => handlePaste(ev)}
            onChange={ev => handleInput(ev, x)}
          />
        ))}
      </div>

      <Btn disabled={loading || resendCooldown} onClick={() => onSendAgain()}>
        Send again
      </Btn>

      {!!resendCooldown && <p className="mt-2">Email sent!</p>}
    </div>
  );
}
