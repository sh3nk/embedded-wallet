import { AccountWalletTypes, WalletType } from '@apillon/wallet-sdk';
import clsx from 'clsx';
import { useState } from 'react';
import Btn from '../ui/Btn';
import { useWalletContext } from '../../contexts/wallet.context';
import Input from '../ui/Input';
import ethIcon from '../../assets/eth_logo.svg';
import polkadotIcon from '../../assets/polkadot-logo.svg';
import Pill from '../ui/Pill';

const walletTypeOptions = [
  {
    type: WalletType.EVM,
    title: 'EVM',
    description: 'Ethereum, L2s, Sidechains',
    icon: ethIcon,
    disabled: false,
  },
  {
    type: WalletType.SUBSTRATE,
    title: 'Substrate',
    description: 'Polkadot, Kusama, Parachains',
    icon: polkadotIcon,
    disabled: false,
  },
];

export default function AccountsAdd() {
  const {
    state: { accountWallets, stagedWalletsCount, walletType },
    wallet,
    handleError,
    goScreenBack,
    handleSuccess,
    setStateValue: setForWallet,
  } = useWalletContext();
  const [type, setType] = useState<AccountWalletTypes>(walletType);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (loading || !title) {
      return;
    }

    setLoading(true);

    try {
      const predictedIndex =
        accountWallets[accountWallets.length - 1].index + 1 + stagedWalletsCount;

      // Save wallet name to tx metadata
      // When updating also check <AccountsImport />
      await wallet?.addAccountWallet({
        internalLabel: 'accountsAdd',
        internalData: JSON.stringify({
          index: predictedIndex,
          title,
          walletType: type,
        }),
      });

      // saveAccountTitle(title, predictedIndex);

      setForWallet('walletsCountBeforeStaging', accountWallets.length);
      setForWallet('stagedWalletsCount', stagedWalletsCount + 1);

      handleSuccess('Account created. Wait for transaction to complete.');
      goScreenBack();
    } catch (e) {
      handleError(e);
    }

    setLoading(false);
  }

  return (
    <div className="pt-6">
      <form
        onSubmit={ev => {
          ev.preventDefault();
          onSubmit();
        }}
      >
        <p className="mb-2 font-normal text-sm text-lightgrey">Account type</p>

        <div className="flex flex-col gap-3 mb-6">
          {walletTypeOptions
            .filter(wt => wt.type === walletType)
            .map(wt => (
              <button
                key={wt.type}
                type="button"
                className={clsx(
                  'oaw-button-plain !bg-primarylight !px-3 !py-2 !rounded-md relative',
                  '!border !border-solid border-brightdark hover:border-lightgrey !transition-colors',
                  '!flex items-center gap-3',
                  {
                    // '!border-yellow': type === wt.type,
                    'pointer-events-none': wt.disabled || true, // there is no choice so the button can be disabled
                  }
                )}
                onClick={() => setType(wt.type)}
              >
                {!!wt.disabled && (
                  <span className="absolute inset-0 bg-primarylight/60">
                    <Pill text="Coming soon" className="absolute top-2 right-2" />
                  </span>
                )}

                <img src={wt.icon} alt={wt.title} className="w-10 h-10" />

                <div className="text-left">
                  <p className="text-sm font-bold text-offwhite mb-1">{wt.title}</p>
                  <p className="text-xs text-lightgrey">{wt.description}</p>
                </div>
              </button>
            ))}
        </div>

        <Input
          label="Account name"
          placeholder="Enter name (for personal reference)"
          value={title}
          autoFocus
          className="w-full mb-6"
          onChange={ev => setTitle(ev.target.value)}
        />

        <Btn type="submit" loading={loading} className="w-full">
          Create account
        </Btn>
      </form>
    </div>
  );
}
