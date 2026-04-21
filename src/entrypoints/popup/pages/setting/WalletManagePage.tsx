import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useChainStore } from '@/stores/chainStore';
import { useUserStore } from '@/stores/userStore';
import { eosChainId } from '@/utils/network';
import { localCache } from '@/utils/cache';
import ExportWallet from './components/ExportWallet';
import DestroyWallet from './components/DestroyWallet';
import ChangePassword from './components/ChangePassword';

const WalletManagePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentChainId = useChainStore((s) => s.currentChainId());

  const [showExport, setShowExport] = React.useState(false);
  const [showDestroy, setShowDestroy] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  const handleAccountManage = () => {
    const chainId = currentChainId || eosChainId;
    navigate(`/setting/account-manage?chainId=${encodeURIComponent(chainId)}`);
  };

  const handleClearCache = async () => {
    await localCache.remove('cachedAbis');
    toast.success(t('public.executeSuccess'));
  };

  const handleLockWallets = async () => {
    await useUserStore.getState().setLocked();
  };

  const menuItems = [
    { title: t('setting.managePermissions'), onClick: handleAccountManage },
    { title: t('setting.exportWallet'), onClick: () => setShowExport(true) },
    { title: t('setting.destroyWallet'), onClick: () => setShowDestroy(true) },
    { title: t('setting.changePassword'), onClick: () => setShowChangePassword(true) },
    { title: t('setting.clearAbiCache'), onClick: handleClearCache },
    { title: t('setting.lockWallets'), onClick: handleLockWallets },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.manageWallets')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mt-4 overflow-hidden">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 cursor-pointer hover:bg-[#F5F0FF]"
              onClick={item.onClick}
            >
              <span className="text-base text-gray-800 pl-2">{item.title}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      <ExportWallet isOpen={showExport} onClose={() => setShowExport(false)} />
      <DestroyWallet isOpen={showDestroy} onClose={() => setShowDestroy(false)} />
      <ChangePassword isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  );
};

export default WalletManagePage;
