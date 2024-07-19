import clsx from 'clsx';
import { useWalletContext } from '../contexts/wallet.context';

export default function WalletError({
  text,
  show,
  className,
}: {
  text?: string;
  show?: boolean;
  className?: string;
}) {
  const { state, handleError } = useWalletContext();

  if ((!state.displayedError && !text) || !show) {
    return <></>;
  }

  return (
    <div
      className={clsx(
        'flex gap-2 justify-between items-start py-2 pl-3 pr-2 break-all text-sm text-white bg-red/75 rounded-md',
        className
      )}
    >
      {state.displayedError || text || ''}

      <button
        title="Dismiss"
        className="text-offwhite hover:text-white -mt-0.5 shrink-0"
        onClick={() => handleError()}
      >
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
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}