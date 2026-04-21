import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useChainStore } from '@/stores/chainStore';

const NetworkSelectPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || '';

  const networks = useChainStore((s) => s.networks);
  const selectedRpc = useChainStore((s) => s.selectedRpc);

  const handleNodeSelect = (chainId: string) => {
    if (type === 'node') {
      navigate(`/setting/node?chainId=${encodeURIComponent(chainId)}`);
    } else {
      navigate(`/setting/account-manage?chainId=${encodeURIComponent(chainId)}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.blockchainFoundation')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mt-4 overflow-hidden">
          {networks.map((item) => (
            <div
              key={item.chainId}
              className="flex items-center justify-between h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 cursor-pointer hover:bg-[#F5F0FF]"
              onClick={() => handleNodeSelect(item.chainId)}
            >
              <span className="text-base text-gray-800 pl-2">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{selectedRpc(item.chainId)}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkSelectPage;
