import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Square } from 'lucide-react';
import { useChainStore } from '@/stores/chainStore';
import { Wallet } from '@/types/wallet';
import PopupBottom from '@/components/PopupBottom';
import { Button } from '@/components/ui/button';

interface ShownWallet extends Wallet {
  index: number;
  chainName: string;
  isSelected: boolean;
}

interface ImportChooseProps {
  isOpen: boolean;
  accountList: Wallet[];
  onClose: () => void;
  onImport: (wallets: Wallet[]) => void;
}

const ImportChoose: React.FC<ImportChooseProps> = ({ isOpen, accountList, onClose, onImport }) => {
  const { t } = useTranslation();
  const findNetwork = useChainStore((s) => s.findNetwork);

  const [wallets, setWallets] = React.useState<ShownWallet[]>([]);
  const [isSelectAll, setIsSelectAll] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const mapped = accountList.map((item, index) => {
        const network = findNetwork(item.chainId);
        return {
          ...item,
          index,
          chainName: network ? network.name : 'Unknown',
          isSelected: true,
        } as ShownWallet;
      });
      setWallets(mapped);
      setIsSelectAll(true);
    }
  }, [isOpen, accountList, findNetwork]);

  const handleAllSelect = (checked: boolean) => {
    setIsSelectAll(checked);
    setWallets((prev) => prev.map((w) => ({ ...w, isSelected: checked })));
  };

  const handleSelectWallet = (index: number) => {
    setWallets((prev) => {
      const updated = prev.map((w) =>
        w.index === index ? { ...w, isSelected: !w.isSelected } : w
      );
      setIsSelectAll(updated.every((w) => w.isSelected));
      return updated;
    });
  };

  const handleImportWallet = () => {
    const selectedWallets = wallets
      .filter((w) => w.isSelected)
      .map((w) => accountList[w.index]);
    onImport(selectedWallets);
  };

  return (
    <PopupBottom isOpen={isOpen} onClose={onClose}>
      <div className="bg-white text-base">
        {/* Header */}
        <div className="flex items-center justify-between h-10 border-b border-gray-200 px-2.5">
          <span className="text-base font-medium text-gray-800">{t('auth.chooseAccount')}</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-primary hover:bg-primary-hover text-white rounded"
              onClick={handleImportWallet}
            >
              {t('wallet.importSelectedWallets')}
            </Button>
            <button
              className="flex items-center gap-1 text-sm text-gray-600"
              onClick={() => handleAllSelect(!isSelectAll)}
            >
              {isSelectAll ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              {t('public.selectAll')}
            </button>
          </div>
        </div>

        {/* Account list */}
        <div className="max-h-[400px] overflow-y-auto">
          {wallets.map((item) => (
            <div
              key={`wallet-${item.index}`}
              className="flex items-center justify-between h-[65px] ml-4 border-b border-gray-200 cursor-pointer"
              onClick={() => handleSelectWallet(item.index)}
            >
              <div className="flex flex-col justify-center">
                <p className="text-[15px] font-semibold text-gray-800">
                  {item.chainName}：<span className="text-gray-600">{item.name}</span>
                </p>
                <div className="flex text-[13px] text-gray-500 w-[280px] overflow-hidden">
                  <span className="w-1/2 overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.keys[0]?.publicKey}
                  </span>
                  <span
                    className="w-1/2 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ direction: 'rtl' }}
                  >
                    {item.keys[0]?.publicKey}
                  </span>
                </div>
              </div>
              {item.isSelected && (
                <CheckSquare className="w-6 h-6 text-primary mr-4 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </PopupBottom>
  );
};

export default ImportChoose;
