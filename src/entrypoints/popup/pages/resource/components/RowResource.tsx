import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hourglass } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import PopupBottom from '@/components/PopupBottom';
import { getChainInstance } from '@/hooks/useChainInstance';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';
import StakedDetail from '@/entrypoints/popup/pages/resource/components/StakedDetail';
import StakedOtherDetail from '@/entrypoints/popup/pages/resource/components/StakedOtherDetail';
import ResourceOption from '@/entrypoints/popup/pages/resource/components/ResourceOption';
import { useSystemContract } from '@/entrypoints/popup/pages/resource/systemContractContext';

type Action = 'stake' | 'refund' | 'rent';

interface RowResourceProps {
  type: 'cpu' | 'net';
  resources: { cpu: ResourceData; net: ResourceData };
  onRefresh: () => void;
}

const RowResource: React.FC<RowResourceProps> = ({ type, resources, onRefresh }) => {
  const { t } = useTranslation();
  const chain = getChainInstance();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentChainId = useChainStore((s) => s.currentChainId());
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const { contract: systemContract, symbol: tokenSymbol } = useSystemContract();
  const isEosMainnet = chainSymbol === 'EOS';
  const currentSymbol = isEosMainnet ? tokenSymbol : chainSymbol;

  const [showStakedDetail, setShowStakedDetail] = React.useState(false);
  const [showStakedOtherDetail, setShowStakedOtherDetail] = React.useState(false);
  const [showOptionDialog, setShowOptionDialog] = React.useState(false);
  const [optionAction, setOptionAction] = React.useState<Action>('stake');

  const res = resources[type];

  const resourceUsed = ((res.use_limit.used / 1000) || 0).toFixed(2);
  const resourceTotal = ((res.use_limit.max / 1000) || 0).toFixed(2);
  const resourcePercentage = res.use_percentage;
  const indicatorClassName = `duration-500 ${
    resourcePercentage < 30 ? 'bg-success' : resourcePercentage > 80 ? 'bg-[#E11D48]' : 'bg-primary'
  }`;

  const [animatedPct, setAnimatedPct] = React.useState(0);
  React.useEffect(() => {
    const id = setTimeout(() => setAnimatedPct(resourcePercentage), 20);
    return () => clearTimeout(id);
  }, [resourcePercentage]);

  const hasRefund = res.refund_request.amount > 0;
  const refundAmount = res.refund_request.amount;
  const refundLeftTime = res.refund_request.left_time;
  const refundReady = refundLeftTime === '-';

  const [refundPopoverOpen, setRefundPopoverOpen] = React.useState(false);

  const refundNowMutation = useMutation({
    mutationFn: async () => {
      const api = chain.getApi(currentChainId);
      const auth = chain.getAuth();
      return api.refund(currentWallet?.name, auth, systemContract);
    },
    onSuccess: () => {
      toast.success(t('resource.stakeSuccess'));
      onRefresh();
    },
    onError: (err: any) => {
      toast.error(chain.getErrorMsg(err));
    },
  });

  const handleShowDialog = (action: Action) => {
    setOptionAction(action);
    setShowOptionDialog(true);
  };

  return (
    <div className="flex flex-col gap-2.5 bg-white rounded-[22px] border border-[#E9E5F5] shadow-[0_6px_18px_rgba(46,16,101,0.03)] p-3.5 flex-1 text-[#52525B]">
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-bold text-[#27272A]">
          {type === 'cpu' ? 'CPU' : t('resource.net')}
        </span>
        {hasRefund && (
          <button
            type="button"
            onClick={() => setRefundPopoverOpen(true)}
            className="p-0.5 rounded-full text-primary hover:bg-[#F5F0FF]"
            aria-label={t('resource.refunding')}
          >
            <Hourglass className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal progress bar */}
      <Progress value={animatedPct} className="h-[10px] bg-purple-bg" indicatorClassName={indicatorClassName} />

      <div className="flex justify-between text-[13px]">
        <span className="font-medium">{t('resource.used')}</span>
        <span className="font-semibold">{resourceUsed} ms / {resourceTotal} ms</span>
      </div>

      <button
        type="button"
        className="flex justify-between items-center text-[12px] cursor-pointer hover:opacity-70"
        onClick={() => { setShowStakedDetail(true); setShowStakedOtherDetail(false); }}
      >
        <span className="font-medium">{t('resource.staked')}</span>
        <span className="font-semibold">{res.total_resources_weight}</span>
      </button>

      <button
        type="button"
        className="flex justify-between items-center text-[12px] cursor-pointer hover:opacity-70"
        onClick={() => { setShowStakedDetail(false); setShowStakedOtherDetail(true); }}
      >
        <span className="font-medium">{t('resource.stakeForOthers')}</span>
        <span className="font-semibold">{res.staked_for_others.toFixed(4)} {currentSymbol}</span>
      </button>

      <div className="flex flex-row justify-end gap-1.5 mt-auto">
        <button type="button" onClick={() => handleShowDialog('stake')}
          className="h-8 px-2.5 rounded-[12px] border border-[#E9D5FF] bg-white text-[12px] font-semibold text-[#3F3F46] flex items-center justify-center hover:bg-[#F5F0FF]">
          {t('resource.stake')}
        </button>
        <button type="button" onClick={() => handleShowDialog('refund')}
          className="h-8 px-2.5 rounded-[12px] border border-[#E9D5FF] bg-white text-[12px] font-semibold text-[#3F3F46] flex items-center justify-center hover:bg-[#F5F0FF]">
          {t('resource.unstake')}
        </button>
        <button type="button" onClick={() => handleShowDialog('rent')}
          className="h-8 px-2.5 rounded-[12px] border border-[#E9D5FF] bg-white text-[12px] font-semibold text-[#3F3F46] flex items-center justify-center hover:bg-[#F5F0FF]">
          {t('resource.rent')}
        </button>
      </div>

      {/* Refund info sheet */}
      <PopupBottom
        isOpen={refundPopoverOpen}
        title={t('resource.refunding')}
        onClose={() => setRefundPopoverOpen(false)}
      >
        <div className="flex flex-col gap-3 px-1 py-2">
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-medium text-muted-foreground">{t('resource.amount')}</span>
            <span className="font-semibold text-[#27272A]">
              {refundAmount.toFixed(4)} {currentSymbol}
            </span>
          </div>
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-medium text-muted-foreground">{t('resource.leftTime')}</span>
            <span className="font-semibold text-[#27272A]">
              {refundReady ? '-' : refundLeftTime}
            </span>
          </div>
          <button
            type="button"
            disabled={!refundReady || refundNowMutation.isPending}
            className={`h-10 w-full rounded-[12px] text-[14px] font-semibold flex items-center justify-center transition-colors ${
              refundReady
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            onClick={
              refundReady
                ? () => {
                    refundNowMutation.mutate();
                    setRefundPopoverOpen(false);
                  }
                : undefined
            }
          >
            {t('resource.refundNow')}
          </button>
        </div>
      </PopupBottom>

      {/* Staked detail sheet */}
      <StakedDetail
        isOpen={showStakedDetail}
        onClose={() => setShowStakedDetail(false)}
        resources={resources}
        type={type}
      />

      {/* Staked other detail sheet */}
      <StakedOtherDetail
        isOpen={showStakedOtherDetail}
        onClose={() => setShowStakedOtherDetail(false)}
        onRefresh={onRefresh}
        type={type}
      />

      {/* Resource option modal */}
      <ResourceOption
        isOpen={showOptionDialog}
        onClose={() => setShowOptionDialog(false)}
        onRefresh={onRefresh}
        action={optionAction}
        resources={resources}
      />
    </div>
  );
};

export default RowResource;
