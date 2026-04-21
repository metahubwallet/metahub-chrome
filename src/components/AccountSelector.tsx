import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, Copy, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';
import { getNetworkLocalIcon } from '@/utils/network';
import { Network } from '@/types/settings';
import { Wallet } from '@/types/wallet';

interface AccountSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onImportKey?: (chainId: string) => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({ isOpen, onClose, onImportKey }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const networks = useChainStore((s) => s.networks);
  const currentChainIdFn = useChainStore((s) => s.currentChainId);
  const wallets = useWalletStore((s) => s.wallets);
  const selectedIndex = useWalletStore((s) => s.selectedIndex);

  const [activeChainId, setActiveChainId] = React.useState<string>(currentChainIdFn());
  const [searchWord, setSearchWord] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveChainId(currentChainIdFn());
      setSearchWord('');
    }
  }, [isOpen, currentChainIdFn]);

  const accounts = React.useMemo(() => {
    const kw = searchWord.trim().toLowerCase();
    return wallets
      .filter((x) => x.chainId === activeChainId)
      .filter((x) => !kw || x.name.toLowerCase().includes(kw));
  }, [wallets, activeChainId, searchWord]);

  const handleLock = async () => {
    onClose();
    await useUserStore.getState().setLocked();
  };

  const handleSelectNetwork = (item: Network) => {
    setActiveChainId(item.chainId);
  };

  const handleSelectAccount = async (account: Wallet) => {
    const index = wallets.findIndex(
      (x) => x.chainId === account.chainId && x.name === account.name
    );
    await useWalletStore.getState().setSelectedIndex(index);
    onClose();
  };

  const handleImportKey = (chainId: string) => {
    if (onImportKey) {
      onImportKey(chainId);
    } else {
      navigate(`/import-key?chainId=${chainId}`);
      onClose();
    }
  };

  const handleCopyKey = async (publicKey: string) => {
    try {
      await navigator.clipboard.writeText(publicKey);
      toast.success(t('public.copySuccess'));
    } catch {
      /* clipboard not available */
    }
  };

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
        {/* Title Bar */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#E5E7EB] shrink-0">
          <button onClick={handleLock} className="cursor-pointer text-[#6B7280] hover:text-[#4B5563]">
            <Lock className="w-5 h-5" />
          </button>
          <span className="text-[17px] font-semibold text-[#1A1A2E]">
            {t('auth.chooseAccount')}
          </span>
          <button onClick={onClose} className="cursor-pointer text-[#6B7280] hover:text-[#4B5563]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Left panel + Right panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Network Icons */}
          <div className="relative w-[72px] shrink-0 bg-[#F5F3FA] border-r border-[#E8E4F0] overflow-y-auto">
            <div className="flex flex-col items-center pt-5 pb-4 gap-5">
              {networks.map((item) => {
                const isActive = activeChainId === item.chainId;
                return (
                  <button
                    key={item.chainId}
                    className="relative flex items-center justify-center w-full cursor-pointer"
                    onClick={() => handleSelectNetwork(item)}
                    title={item.name}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-l-sm bg-[#C84DFA]" />
                    )}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${
                        isActive
                          ? 'ring-2 ring-[#C084FC]'
                          : ''
                      }`}
                    >
                      <img
                        src={getNetworkLocalIcon(item.chain, isActive)}
                        className="w-9 h-9 rounded-full"
                        alt={item.name}
                      />
                    </div>
                  </button>
                );
              })}
              {/* Add Network */}
              <button
                className="flex items-center justify-center cursor-pointer"
                onClick={() => {
                  navigate('/setting/network-manage');
                  onClose();
                }}
                title={t('setting.addNetwork') || 'Add network'}
              >
                <div className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#6B7280]" />
                </div>
              </button>
            </div>
          </div>

          {/* Right Panel: Account List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header: Network name + Search + Import button */}
            <div className="flex items-center h-11 px-4 border-b border-[#E5E7EB] shrink-0 gap-2">
              <span className="flex-1 text-[15px] font-semibold text-[#1A1A2E] truncate min-w-0">
                {networks.find((n) => n.chainId === activeChainId)?.name}
              </span>
              <div className="w-28 flex items-center h-7 bg-[#F5F3FA] rounded-full px-2.5 gap-1.5 shrink-0">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                <input
                  className="flex-1 bg-transparent text-[12px] text-[#1A1A2E] placeholder-[#9CA3AF] outline-none min-w-0"
                  placeholder="Search.."
                  value={searchWord}
                  onChange={(e) => setSearchWord(e.target.value)}
                />
              </div>
              <button
                onClick={() => handleImportKey(activeChainId)}
                className="w-7 h-7 shrink-0 rounded-full border border-[#D1D5DB] flex items-center justify-center cursor-pointer"
                title={t('public.importKey') || 'Import key'}
              >
                <Plus className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {accounts.length === 0 ? (
                <button
                  className="mt-4 w-full h-10 bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white rounded-xl text-[15px] font-semibold cursor-pointer"
                  onClick={() => handleImportKey(activeChainId)}
                >
                  + {t('public.importKey')}
                </button>
              ) : (
                accounts.map((account, accIndex) => {
                  const isSelected =
                    selectedIndex === wallets.findIndex(
                      (w) => w.chainId === account.chainId && w.name === account.name
                    );
                  const publicKey = account.keys[0]?.publicKey || '';

                  return (
                    <div
                      key={`wallet-${account.name}-${accIndex}`}
                      className={`flex items-center h-[72px] rounded-[14px] px-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#F0EAFF] border border-[#7C3AED33]'
                          : 'bg-[#F5F5F5] border border-[#E5E7EB]'
                      }`}
                      onClick={() => handleSelectAccount(account)}
                    >
                      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold text-[#1A1A2E]">{account.name}</span>
                          {publicKey && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyKey(account.name);
                              }}
                              className="text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer"
                            >
                              <Copy className="w-[13px] h-[13px]" />
                            </button>
                          )}
                        </div>
                        <span className="text-[12px] text-[#6B7280] font-mono truncate">
                          {publicKey ? `${publicKey.substring(0, 8)}...${publicKey.slice(-16)}` : ''}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSelector;
