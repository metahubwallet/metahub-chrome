import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { eosChainId } from '@/utils/network';
import { Network } from '@/types/settings';

const NetworkManagePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const networks = useChainStore((s) => s.networks);
  const customRpcs = useChainStore((s) => s.customRpcs);
  const setNetworks = useChainStore((s) => s.setNetworks);
  const setCustomRpcs = useChainStore((s) => s.setCustomRpcs);
  const wallets = useWalletStore((s) => s.wallets);

  const [removeTarget, setRemoveTarget] = React.useState<Network | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleRemoveClick = (item: Network) => {
    setRemoveTarget(item);
    setShowConfirm(true);
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;

    const hasAccount = wallets.some((w) => w.chainId === removeTarget.chainId);
    if (hasAccount) {
      toast.error(t('setting.alreadyExistAccount'));
      setShowConfirm(false);
      setRemoveTarget(null);
      return;
    }

    const updated = networks.filter((n) => n.chainId !== removeTarget.chainId);
    setNetworks(updated);

    if (customRpcs[removeTarget.chainId]) {
      const updatedRpcs = { ...customRpcs };
      delete updatedRpcs[removeTarget.chainId];
      setCustomRpcs(updatedRpcs);
    }

    setShowConfirm(false);
    setRemoveTarget(null);
  };

  const shortChainId = (chainId: string) =>
    `${chainId.substring(0, 24)}...${chainId.substring(chainId.length - 12)}`;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.manageNetworks')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div className="py-3 text-base font-medium text-[#20173C]">{t('setting.enableNetwork')}</div>
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] overflow-hidden">
          {networks.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between px-4 py-3 border-b border-[#F3E8FF] last:border-b-0"
            >
              <div className="flex-1 flex flex-col">
                <span className="text-base text-gray-800">{item.name}</span>
                <span className="text-xs text-gray-400 font-mono truncate">
                  {shortChainId(item.chainId)}
                </span>
              </div>
              {item.chainId !== eosChainId && (
                <Trash2
                  className="h-5 w-5 text-red-500 cursor-pointer ml-3"
                  onClick={() => handleRemoveClick(item)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center px-4 py-3 gap-3 shrink-0">
        <Button
          className="flex-1 h-12 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold text-xs shadow-none hover:opacity-90"
          onClick={() => navigate('/setting/network-add')}
        >
          {t('setting.addExistingNetwork')}
        </Button>
        <Button
          className="flex-1 h-12 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold text-xs shadow-none hover:opacity-90"
          onClick={() => navigate('/setting/network-add-custom')}
        >
          {t('setting.addCustomNetwork')}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title={t('public.tip')}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmRemove}
        confirmText={t('password.submit')}
        cancelText={t('password.cancel')}
      >
        <p>
          {t('setting.sureDeletePrefix')}
          {removeTarget?.name}
          {t('setting.sureDeleteSuffix')}
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default NetworkManagePage;
