import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { Wallet } from '@/types/wallet';

const AccountManagePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chainId = searchParams.get('chainId') || '';

  const wallets = useWalletStore((s) => s.wallets);
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const findNetwork = useChainStore((s) => s.findNetwork);

  const chainWallets = React.useMemo(() => {
    const currentFirst = currentWallet && currentWallet.chainId === chainId ? [currentWallet] : [];
    const others = wallets.filter(
      (w) => w.chainId === chainId && w.name !== currentWallet?.name
    );
    return [...currentFirst, ...others];
  }, [wallets, currentWallet, chainId]);

  const viewAccountDetail = (account: Wallet) => {
    navigate(`/setting/account-detail?account=${encodeURIComponent(account.name)}&chainId=${encodeURIComponent(chainId)}`);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.manageWallets')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-3 mt-4">
          {chainWallets.map((wallet) => (
            <div
              key={wallet.name}
              className="flex items-center justify-between bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] px-4 py-4 cursor-pointer hover:bg-[#F5F0FF] min-h-14"
              onClick={() => viewAccountDetail(wallet)}
            >
              <span className="text-lg text-gray-800">{wallet.name}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          ))}

          <div
            className="flex items-center justify-center border border-dashed border-[#D946EF] bg-white rounded-2xl h-14 cursor-pointer"
            onClick={() => navigate(`/import-key?chainId=${encodeURIComponent(chainId)}`)}
          >
            <Plus className="h-5 w-5 text-[#7C3AED] mr-2 font-bold" />
            <span className="text-[#7C3AED] font-semibold">{t('public.importKey')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountManagePage;
