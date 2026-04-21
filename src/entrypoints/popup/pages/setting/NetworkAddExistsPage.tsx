import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { supportNetworks, eosChainId } from '@/utils/network';
import { Network } from '@/types/settings';

const NetworkAddExistsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const networks = useChainStore((s) => s.networks);
  const customRpcs = useChainStore((s) => s.customRpcs);
  const setNetworks = useChainStore((s) => s.setNetworks);
  const setSelectedRpc = useChainStore((s) => s.setSelectedRpc);
  const setCustomRpcs = useChainStore((s) => s.setCustomRpcs);
  const wallets = useWalletStore((s) => s.wallets);

  const [actionTarget, setActionTarget] = React.useState<{ network: Network; action: 'add' | 'remove' } | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const networkExists = (chainId: string) => networks.some((n) => n.chainId === chainId);

  const addNetwork = (network: Network) => {
    setNetworks([...networks, network]);
    setSelectedRpc(network.chainId, network.endpoint);
    const updated = {
      ...customRpcs,
      [network.chainId]: [{ name: network.name, endpoint: network.endpoint }],
    };
    setCustomRpcs(updated);
  };

  const removeNetwork = (network: Network) => {
    const hasAccount = wallets.some((w) => w.chainId === network.chainId);
    if (hasAccount) {
      toast.error(t('setting.alreadyExistAccount'));
      return;
    }
    const updated = networks.filter((n) => n.chainId !== network.chainId);
    setNetworks(updated);
    if (customRpcs[network.chainId]) {
      const updatedRpcs = { ...customRpcs };
      delete updatedRpcs[network.chainId];
      setCustomRpcs(updatedRpcs);
    }
  };

  const handleConfirm = () => {
    if (!actionTarget) return;
    if (actionTarget.action === 'add') {
      addNetwork(actionTarget.network);
    } else {
      removeNetwork(actionTarget.network);
    }
    setShowConfirm(false);
    setActionTarget(null);
    navigate(-1);
  };

  const confirmMessage = actionTarget
    ? actionTarget.action === 'add'
      ? `${t('setting.sureAddPrefix')}${actionTarget.network.name}${t('setting.sureAddSuffix')}`
      : `${t('setting.sureDeletePrefix')}${actionTarget.network.name}${t('setting.sureDeleteSuffix')}`
    : '';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.addExistingNetwork')} />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col mt-3">
          {/* Table Header */}
          <div className="flex items-center px-4 py-3 bg-[#F5F0FF] rounded-t-2xl">
            <span className="w-[90px] text-xs font-semibold text-[#7C3AED]">{t('setting.name')}</span>
            <span className="flex-1 text-xs font-semibold text-[#7C3AED]">ChainId</span>
            <span className="w-14 text-xs font-semibold text-[#7C3AED] text-center">{t('setting.operation')}</span>
          </div>

          {/* Table Body */}
          <div className="flex flex-col bg-[#FAFAFE] rounded-b-2xl border border-[#E9D8FD] border-t-0 overflow-hidden">
            {supportNetworks.map((network, index) => (
              <div
                key={index}
                className={`flex items-center h-12 px-4 ${index < supportNetworks.length - 1 ? 'border-b border-[#F3E8FF]' : ''}`}
              >
                <span className="w-[90px] text-[13px] text-[#27272A] truncate">{network.name}</span>
                <span className="flex-1 text-[11px] text-[#9CA3AF] font-mono truncate">
                  {network.chainId.substring(0, 8)}...
                </span>
                <div className="w-14 flex items-center justify-center">
                  {!networkExists(network.chainId) && (
                    <Plus
                      className="h-5 w-5 text-[#7C3AED] cursor-pointer"
                      onClick={() => {
                        setActionTarget({ network, action: 'add' });
                        setShowConfirm(true);
                      }}
                    />
                  )}
                  {networkExists(network.chainId) && network.chainId !== eosChainId && (
                    <Trash2
                      className="h-[18px] w-[18px] text-red-500 cursor-pointer"
                      onClick={() => {
                        setActionTarget({ network, action: 'remove' });
                        setShowConfirm(true);
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title={t('public.tip')}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        confirmText={t('password.submit')}
        cancelText={t('password.cancel')}
      >
        <p>{confirmMessage}</p>
      </ConfirmDialog>
    </div>
  );
};

export default NetworkAddExistsPage;
