import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Network, WalletProvider, useWalletContext } from '../contexts/wallet.context';
import { ReactNode, useEffect, useRef, useState } from 'react';
import WalletAuth from './WalletAuth';
import WalletMain from './WalletMain';
import { ethers } from 'ethers';
import WalletApprove, { DisplayedContractParams } from './WalletApprove';
import { AppParams, Events, UserRejectedRequestError } from '@apillon/wallet-sdk';
import { TransactionsProvider, useTransactionsContext } from '../contexts/transactions.context';
import Btn from './Btn';

export type AppProps = {
  /**
   * Configuration of available networks. Oasis Sapphire is always included (ids 23294 and 23295).
   * @example
   ```ts
    [
      {
        name: 'Moonbeam Testnet',
        id: 1287,
        rpcUrl: 'https://rpc.testnet.moonbeam.network',
        explorerUrl: 'https://moonbase.moonscan.io',
      }
    ]
   ```
   */
  networks?: Network[];

  /**
   * Do not automatically broadcast with SDK after confirming a transaction.
   *
   * Useful when using ethers/viem where txs are automatically processed with contract interfaces e.g.
   */
  disableAutoBroadcastAfterSign?: boolean;

  /**
   * Remove styles from "open wallet" button
   */
  disableDefaultActivatorStyle?: boolean;

  /**
   * Placeholder displayed in input for username/email
   */
  authFormPlaceholder?: string;

  /**
   * Use email validation on input for username/email
   */
  isAuthEmail?: boolean;

  /**
   * Skip email confirmation / code check.
   */
  isEmailConfirm?: boolean;

  /**
   * Executes in auth process, after user enters a valid email. If an error is thrown, the auth process will terminate.
   *
   * Should be used to send a verification code to user.
   *
   * If this is not provided, Apillon service is used.
   */
  onEmailConfirmRequest?: (email: string) => Promise<any>;

  /**
   * Executes in auth process, during email verification, confirm that entered code is correct.
   *
   * If `onEmailConfirmRequest` is not provided, Apillon service is used.
   */
  onEmailConfirm?: (email: string, code: string) => Promise<any>;
} & AppParams;

function Wallet({
  disableAutoBroadcastAfterSign = false,
  disableDefaultActivatorStyle = false,
  ...restOfProps
}: AppProps) {
  const { state, wallet, setScreen, handleError, reloadUserBalance } = useWalletContext();
  const { dispatch: dispatchTx } = useTransactionsContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToConfirm, setTxToConfirm] = useState<ethers.TransactionLike<ethers.AddressLike>>();
  const [contractFunctionData, setContractFunctionData] = useState<DisplayedContractParams>();
  const [messageToSign, setMessageToSign] = useState('');
  const [approvedData, setApprovedData] = useState({
    title: '',
    txHash: '',
    explorerUrl: '',
  });

  const approveParams =
    useRef<Partial<Events['txApprove'] & { signature: Events['signatureRequest'] }>>();

  const loggedIn = state.username && state.address;

  /**
   * Handle wallet SDK Events
   */
  useEffect(() => {
    const onTxApproveEvent = (params: Events['txApprove']) => {
      if (params.plain) {
        setTxToConfirm(params.plain?.tx);
        approveParams.current = params;
        setIsModalOpen(true);
      } else if (params.contractWrite) {
        setContractFunctionData({
          chainId: params.contractWrite.chainId,
          contractAddress: params.contractWrite.contractAddress,
          contractFunctionName: params.contractWrite.contractFunctionName,
          contractFunctionValues: params.contractWrite.contractFunctionValues,
        });
        approveParams.current = params;
        setIsModalOpen(true);
      }
    };

    const onSignatureRequestEvent = (params: Events['signatureRequest']) => {
      setMessageToSign(params.message as string);
      approveParams.current = { signature: params };
      setIsModalOpen(true);
    };

    const onTxSubmittedEvent = (params: Events['txSubmitted']) => {
      dispatchTx({ type: 'addTx', payload: params });
    };

    const onProviderRequestAccounts = () => {
      setIsModalOpen(true);
    };

    const onDataUpdated = (params: Events['dataUpdated']) => {
      if (params.name === 'defaultNetworkId') {
        reloadUserBalance();
      }
    };

    if (wallet) {
      wallet.events.on('txApprove', onTxApproveEvent);
      wallet.events.on('signatureRequest', onSignatureRequestEvent);
      wallet.events.on('txSubmitted', onTxSubmittedEvent);
      wallet.events.on('providerRequestAccounts', onProviderRequestAccounts);
      wallet.events.on('dataUpdated', onDataUpdated);
    }

    return () => {
      if (wallet) {
        wallet.events.off('txApprove', onTxApproveEvent);
        wallet.events.off('signatureRequest', onSignatureRequestEvent);
        wallet.events.off('txSubmitted', onTxSubmittedEvent);
        wallet.events.off('providerRequestAccounts', onProviderRequestAccounts);
        wallet.events.off('dataUpdated', onDataUpdated);
      }
    };
  }, [wallet]);

  /**
   * Reset approve screen if closed
   */
  useEffect(() => {
    if (!isModalOpen) {
      if (!!txToConfirm || !!messageToSign || !!contractFunctionData) {
        closeApproveScreen();
      }

      if (state.walletScreen !== 'main') {
        // Wait for modal transition
        setTimeout(() => {
          setScreen('main');
        }, 200);
      }

      if (wallet && wallet.waitForAccountResolver) {
        wallet.waitForAccountResolver('');
        wallet.waitForAccountResolver = null;
      }
    }
  }, [isModalOpen]);

  function closeApproveScreen() {
    setIsModalOpen(false);

    // Wait for modal transition
    setTimeout(() => {
      setTxToConfirm(undefined);
      setContractFunctionData(undefined);
      setMessageToSign('');
      setApprovedData({
        title: '',
        txHash: '',
        explorerUrl: '',
      });
    }, 200);
  }

  let modalContent = <></>;

  if (!loggedIn) {
    /**
     * Login/register
     */
    modalContent = <WalletAuth {...restOfProps} />;
  } else if (!!txToConfirm || !!messageToSign || !!contractFunctionData) {
    if (approvedData.title) {
      /**
       * Transaction submitted to network
       */
      modalContent = (
        <div className="text-center">
          <h2 className="mb-6">{approvedData.title}</h2>

          {!!approvedData.explorerUrl && (
            <p className="mb-6">
              <Btn variant="secondary" href={approvedData.explorerUrl} blank>
                View on explorer
              </Btn>
            </p>
          )}

          {!!approvedData.txHash && (
            <p className="break-all my-3">Transaction hash: {approvedData.txHash}</p>
          )}

          <div className="mt-12">
            <Btn onClick={() => closeApproveScreen()}>Close</Btn>
          </div>
        </div>
      );
    } else {
      /**
       * Approve tx (authenticate w/ passkey e.g.)
       */
      modalContent = (
        <WalletApprove
          tx={txToConfirm}
          signMessage={messageToSign}
          contractFunctionData={contractFunctionData}
          onApprove={async () => {
            if (approveParams.current) {
              try {
                handleError();

                if (approveParams.current.signature) {
                  await wallet?.signMessage({
                    ...approveParams.current.signature,
                    authData: { username: state.username },
                  });

                  closeApproveScreen();
                } else if (approveParams.current.plain) {
                  const res = await wallet?.signPlainTransaction({
                    ...approveParams.current.plain,
                    authData: { username: state.username },
                  });

                  if (disableAutoBroadcastAfterSign) {
                    closeApproveScreen();
                  } else if (res) {
                    const { signedTxData, chainId } = res;
                    const res2 = await wallet?.broadcastTransaction(
                      signedTxData,
                      chainId,
                      approveParams.current.plain.label || 'Transaction'
                    );

                    setApprovedData({
                      title: 'Transaction submitted',
                      explorerUrl: res2?.txItem.explorerUrl || '',
                      txHash: res2?.txHash || '',
                    });
                  }
                } else if (approveParams.current.contractWrite) {
                  const res = await wallet?.signContractWrite({
                    ...approveParams.current.contractWrite,
                    authData: { username: state.username },
                  });

                  if (disableAutoBroadcastAfterSign) {
                    closeApproveScreen();
                  } else if (res) {
                    const { signedTxData, chainId } = res;
                    const res2 = await wallet?.broadcastTransaction(
                      signedTxData,
                      chainId,
                      approveParams.current.contractWrite.label || 'Transaction'
                    );

                    setApprovedData({
                      title: 'Transaction submitted',
                      explorerUrl: res2?.txItem.explorerUrl || '',
                      txHash: res2?.txHash || '',
                    });
                  }
                }
              } catch (e) {
                handleError(e);
              }
            }
          }}
          onDecline={() => {
            closeApproveScreen();

            if (approveParams.current?.contractWrite?.reject) {
              approveParams.current.contractWrite.reject(new UserRejectedRequestError());
            } else if (approveParams.current?.plain?.reject) {
              approveParams.current.plain.reject(new UserRejectedRequestError());
            } else if (approveParams.current?.signature?.reject) {
              approveParams.current.signature.reject(new UserRejectedRequestError());
            }
          }}
        />
      );
    }
  } else {
    /**
     * Default UI
     */
    modalContent = <WalletMain />;
  }

  return (
    <div>
      <Modal isOpen={isModalOpen} setIsOpen={setIsModalOpen}>
        {modalContent}
      </Modal>

      <button
        id="oaw-wallet-widget-btn"
        className={!disableDefaultActivatorStyle ? 'oaw-btn-default-style' : undefined}
        onClick={() => setIsModalOpen(true)}
      >
        {loggedIn ? 'Open wallet' : 'Sign in'}
      </button>
    </div>
  );
}

function Modal({
  children,
  isOpen,
  setIsOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (to: boolean) => void;
}) {
  return (
    <>
      <Transition show={isOpen}>
        <Dialog
          id="oaw-wallet-widget"
          open={isOpen}
          style={{
            position: 'relative',
            zIndex: '10001',
          }}
          onClose={() => setIsOpen(false)}
        >
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </TransitionChild>

          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="fixed inset-0 w-screen overflow-y-auto p-4">
              <div className="flex items-center justify-center min-h-full">
                <DialogPanel className="relative max-w-lg w-full min-h-[600px] bg-dark p-8 sm:py-16 sm:px-12 border border-brightdark text-offwhite">
                  <button className="absolute top-2 right-2" onClick={() => setIsOpen(false)}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 10.6569L6.34317 5L4.92896 6.41421L10.5858 12.0711L4.92898 17.7279L6.3432 19.1421L12 13.4853L17.6569 19.1421L19.0711 17.7279L13.4143 12.0711L19.0711 6.41421L17.6569 5L12 10.6569Z"
                        fill="#9C9C95"
                      />
                    </svg>
                  </button>

                  {children}
                </DialogPanel>
              </div>
            </div>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

export default function WalletWidget(props: AppProps) {
  return (
    <WalletProvider {...props}>
      <TransactionsProvider>
        <Wallet {...props} />
      </TransactionsProvider>
    </WalletProvider>
  );
}
