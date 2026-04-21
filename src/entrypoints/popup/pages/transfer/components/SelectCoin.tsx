import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';
import { Balance } from '@/types/tokens';
import placeholderImg from '@/assets/images/placeholder.png';

interface SelectCoinProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeToken: (coin: Balance) => void;
}

const SelectCoin: React.FC<SelectCoinProps> = ({ isOpen, onClose, onChangeToken }) => {
  const { t } = useTranslation();
  const rawTokens = useWalletStore((s) => s.currentUserTokens());
  const getToken = useWalletStore((s) => s.getToken);

  const currentUserTokens = React.useMemo(
    () =>
      rawTokens.map((coin) => {
        const matched = getToken(coin);
        return { ...coin, logo: matched.logo || coin.logo || '' };
      }),
    [rawTokens, getToken],
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] h-[450px] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Title Row */}
        <div className="flex items-center justify-between h-14 px-5 shrink-0">
          <span className="text-[17px] font-bold text-[#1A1A2E]">
            {t('wallet.selectToken') || 'Select Token'}
          </span>
          <button onClick={onClose} className="cursor-pointer text-[#6B7280] hover:text-[#4B5563]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Headers */}
        <div className="flex items-center h-10 px-5 bg-[#F9FAFB] shrink-0">
          <div className="w-10 shrink-0" />
          <span className="flex-1 text-[13px] font-semibold text-[#9CA3AF] ml-3">
            {t('wallet.symbol')}
          </span>
          <span className="w-20 text-[13px] font-semibold text-[#9CA3AF] text-right">
            {t('wallet.balance')}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E5E7EB]" />

        {/* Token List */}
        <div className="flex-1 overflow-y-auto">
          {currentUserTokens.map((coin, index) => (
            <React.Fragment key={`${coin.contract}-${coin.symbol}-${index}`}>
              {index > 0 && <div className="h-px bg-[#F3F4F6]" />}
              <button
                type="button"
                className="flex items-center w-full h-14 px-5 gap-3 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                onClick={() => onChangeToken(coin)}
              >
                {/* Logo */}
                {coin.logo ? (
                  <img
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                    src={coin.logo}
                    alt={coin.symbol}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImg;
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#F0EAFF] flex items-center justify-center text-sm font-bold text-[#7C3AED] shrink-0">
                    {coin.symbol.charAt(0)}
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                  <span className="text-[14px] font-semibold text-[#18181B] text-left">{coin.symbol}</span>
                  <span className="text-[12px] text-[#9CA3AF] truncate text-left">{coin.contract}</span>
                </div>
                {/* Balance */}
                <span className="w-20 text-[14px] text-[#18181B] text-right shrink-0">
                  {coin.amount}
                </span>
              </button>
            </React.Fragment>
          ))}

          {currentUserTokens.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[200px] text-[#9CA3AF] text-sm">
              {t('public.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectCoin;
