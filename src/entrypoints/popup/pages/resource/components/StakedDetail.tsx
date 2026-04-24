import * as React from 'react';
import { useTranslation } from 'react-i18next';
import PopupBottom from '@/components/PopupBottom';
import { useChainStore } from '@/stores/chainStore';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';
import { useSystemContract } from '@/entrypoints/popup/pages/resource/systemContractContext';

interface StakedDetailProps {
  isOpen: boolean;
  onClose: () => void;
  resources: { cpu: ResourceData; net: ResourceData };
  type: 'cpu' | 'net';
}

const StakedDetail: React.FC<StakedDetailProps> = ({ isOpen, onClose, resources, type }) => {
  const { t } = useTranslation();
  const res = resources[type];
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const { symbol: tokenSymbol } = useSystemContract();
  const currentSymbol = chainSymbol === 'EOS' ? tokenSymbol : chainSymbol;

  return (
    <PopupBottom isOpen={isOpen} title={t('resource.stakeInfo')} onClose={onClose}>
      <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
        <div
          className="flex flex-row justify-between items-center mx-4 min-h-[44px] py-2"
        >
          <span className="text-[15px] font-semibold text-gray-800 shrink-0">
            {t('resource.selfStake')}:
          </span>
          <span className="text-[15px] font-semibold text-gray-500 text-right">
            {res.self_delegated_bandwidth_weight}
          </span>
        </div>
        <div
          className="flex flex-row justify-between items-center mx-4 min-h-[44px] py-2"
        >
          <span className="text-[15px] font-semibold text-gray-800 shrink-0">
            {t('resource.otherStake')}:
          </span>
          <span className="text-[15px] font-semibold text-gray-500 text-right">
            {res.staked_for_user} {currentSymbol}
          </span>
        </div>
      </div>
    </PopupBottom>
  );
};

export default StakedDetail;
