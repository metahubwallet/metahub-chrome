import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';
import { tool } from '@/utils/tool';
import metahubLogo from '@/assets/images/metahub@2x.png';

interface TopNavProps {
  onChangeAccount?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onChangeAccount }) => {
  const { t } = useTranslation();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const accountName = currentWallet?.name
    ? tool.briefAccount(currentWallet.name)
    : t('public.noAccount');

  return (
    <header className="absolute left-0 top-0 w-full z-30 text-[19px] text-white text-center">
      <div className="relative flex items-center justify-between px-4 h-[70px]">
        {/* Logo */}
        <img src={metahubLogo} className="w-[120px]" alt="MetaHub" />

        {/* Account pill */}
        <button
          onClick={onChangeAccount}
          className="flex items-center gap-1.5 bg-white rounded-2xl px-3.5 h-[35px] border border-[#F1EAFB] cursor-pointer"
          style={{ boxShadow: '0px 1px 10px 6px rgba(1,45,107,0.02)' }}
          aria-label="Change account"
        >
          <span className="text-[13px] font-bold text-gray-900">{accountName}</span>
          <ChevronDown className="w-3 h-3 text-gray-800" />
        </button>
      </div>
    </header>
  );
};

export default TopNav;
