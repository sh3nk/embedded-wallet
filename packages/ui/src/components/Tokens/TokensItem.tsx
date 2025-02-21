import clsx from 'clsx';
import { TokenInfo } from '../../contexts/tokens.context';
import IconChevron from '../ui/Icon/IconChevron';
import { formatBalance } from '../../lib/helpers';

export default function TokensItem({
  token,
  asButton,
  disabled,
  className,
  onClick,
}: {
  token: TokenInfo;
  asButton?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="relative w-10 h-10 rounded-full bg-black text-white overflow-hidden flex justify-center items-center">
        {!!token.imageUrl && <img src={token.imageUrl} alt={token.symbol} />}
        {!token.imageUrl && (
          <span className="uppercase text-xl font-semibold">{token.symbol[0]}</span>
        )}
      </div>

      <div className="grow">
        <p className="text-sm font-bold text-offwhite mb-0.5">{token.name}</p>

        <p className="text-xs text-lightgrey font-normal">
          {formatBalance(token.balance, token.symbol)}
        </p>
      </div>

      {asButton && <IconChevron />}
    </>
  );

  const classes = clsx(
    '!px-3 !py-2 !rounded-md !flex items-center gap-2 !bg-primarylight !text-left',
    '!border !border-solid border-transparent !transition-colors',
    {
      'oaw-button-plain hover:border-darkgrey': asButton,
      'opacity-60 grayscale pointer-events-none': disabled,
    },
    className
  );

  if (asButton) {
    <button disabled={disabled} className={classes} onClick={onClick}>
      {content}
    </button>;
  }

  return (
    <div className={classes} onClick={onClick}>
      {content}
    </div>
  );
}
