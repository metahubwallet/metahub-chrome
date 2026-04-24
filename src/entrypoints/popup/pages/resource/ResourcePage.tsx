import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageHeader from '@/components/PageHeader';
import { useResourceInfo } from '@/hooks/useResourceInfo';
import { useSmoothModeTime } from '@/hooks/useSmoothModeTime';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { eosChainId } from '@/utils/network';
import RowResource from '@/entrypoints/popup/pages/resource/components/RowResource';
import RowRam from '@/entrypoints/popup/pages/resource/components/RowRam';
import {
  SystemContractProvider,
  useSystemContract,
  type SystemContractToken,
} from '@/entrypoints/popup/pages/resource/systemContractContext';

export interface ResourceData {
  core_liquid_balance: string;
  use_percentage: number;
  use_limit: { max: number; used: number };
  stake_max: number;
  refund_request: { amount: number; request_time: number; left_time: string };
  total_resources_weight: string;
  self_delegated_bandwidth_weight: string;
  staked_for_others: number;
  staked_for_user: number;
}

export interface ResourceBase {
  core_liquid_balance: string;
  use_percentage: number;
  use_limit: { max: number; used: number };
}

function buildEmptyResourceData(symbol: string): ResourceData {
  const emptyCoin = `0.0000 ${symbol}`;
  return {
    core_liquid_balance: emptyCoin,
    use_percentage: 0,
    use_limit: { max: 1, used: 0 },
    stake_max: 0,
    refund_request: { amount: 0, request_time: 0, left_time: '' },
    total_resources_weight: emptyCoin,
    self_delegated_bandwidth_weight: emptyCoin,
    staked_for_others: 0,
    staked_for_user: 0,
  };
}

function calcLeftTime(requestTime: number): string {
  const leftTime = Date.now() - requestTime;
  const minutes = 4320 - (leftTime / 60000 - 479);
  if (minutes <= 0) return '-';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes / 60) % 24);
  const m = Math.floor(minutes % 60);
  return `${d}d ${h}h ${m}m`;
}

const ResourcePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentWallet = useWalletStore((s) => s.currentWallet());
  const wallets = useWalletStore((s) => s.wallets);
  const selectedIndex = useWalletStore((s) => s.selectedIndex);
  const setWallets = useWalletStore((s) => s.setWallets);
  const currentChainId = useChainStore((s) => s.currentChainId());
  const chainSymbol = useChainStore((s) => s.currentSymbol());
  const { symbol: effectiveSymbol } = useSystemContract();

  const isEosMainnet = currentChainId === eosChainId;
  const currentSymbol = isEosMainnet ? effectiveSymbol : chainSymbol;
  const remapSymbol = React.useCallback(
    (s: string) => (isEosMainnet ? s.replace(/\bEOS\b/g, effectiveSymbol) : s),
    [isEosMainnet, effectiveSymbol]
  );

  const [smoothMode, setSmoothMode] = React.useState<boolean>(
    () => currentWallet?.smoothMode ?? false
  );

  const { data: smoothModeTimeData } = useSmoothModeTime();
  const smoothModeCPU = React.useMemo(() => {
    const res = smoothModeTimeData as any;
    if (res?.code === 200 && res?.result != null) {
      return `${Math.floor(res.result / 1000)} ms`;
    }
    return '~';
  }, [smoothModeTimeData]);

  const { data: resourceData, refetch } = useResourceInfo();

  const resources = React.useMemo<{ cpu: ResourceData; net: ResourceData }>(() => {
    const empty = buildEmptyResourceData(currentSymbol);
    if (!resourceData) return { cpu: empty, net: empty };

    const { delegatebw, accountInfo, ramMarket: _ramMarket } = resourceData;
    const account = accountInfo;
    if (!account) return { cpu: empty, net: empty };

    const emptyCoin = `0.0000 ${currentSymbol}`;
    const str = (v: unknown) => (v != null ? String(v) : '');
    const coreLiquid = remapSymbol(str(account.core_liquid_balance) || emptyCoin);

    let stakeForOthersCPU = 0;
    let stakeForOthersNET = 0;
    if (delegatebw) {
      delegatebw.forEach((item: any) => {
        if (item.to !== currentWallet?.name) {
          stakeForOthersNET += parseFloat(str(item.net_weight));
          stakeForOthersCPU += parseFloat(str(item.cpu_weight));
        }
      });
    }

    const buildResource = (
      limitObj: { max: number; used: number },
      refundAmount: number,
      refundNetAmount: number,
      totalWeight: string,
      selfWeight: string,
      stakeForOthers: number
    ): ResourceData => {
      void refundNetAmount;
      const pct = limitObj.max > 0 ? Math.min(100, Math.floor((limitObj.used / limitObj.max) * 100)) : 100;
      const refundReq = account.refund_request
        ? {
            amount: refundAmount,
            request_time: new Date(str(account.refund_request.request_time)).getTime(),
            left_time: '',
          }
        : { amount: 0, request_time: 0, left_time: '' };

      if (refundReq.amount) {
        refundReq.left_time = calcLeftTime(refundReq.request_time);
      }

      const stakeMax = parseFloat(coreLiquid) + refundReq.amount;
      const stakedForUser = Number(
        (parseFloat(totalWeight) - parseFloat(selfWeight)).toFixed(4)
      );

      return {
        core_liquid_balance: coreLiquid,
        use_percentage: pct,
        use_limit: limitObj,
        stake_max: Number(stakeMax.toFixed(4)),
        refund_request: refundReq,
        total_resources_weight: totalWeight,
        self_delegated_bandwidth_weight: selfWeight,
        staked_for_others: Number(stakeForOthers.toFixed(4)),
        staked_for_user: Math.max(0, stakedForUser),
      };
    };

    const toLimit = (l: any) => {
      const max = Number(l.max);
      const used = Number(l.used);
      return { max, used: Math.min(used, max) };
    };

    const cpu = buildResource(
      toLimit(account.cpu_limit),
      account.refund_request ? parseFloat(str(account.refund_request.cpu_amount)) : 0,
      account.refund_request ? parseFloat(str(account.refund_request.net_amount)) : 0,
      remapSymbol(str(account.total_resources?.cpu_weight) || emptyCoin),
      remapSymbol(str(account.self_delegated_bandwidth?.cpu_weight) || emptyCoin),
      stakeForOthersCPU
    );
    const net = buildResource(
      toLimit(account.net_limit),
      account.refund_request ? parseFloat(str(account.refund_request.net_amount)) : 0,
      account.refund_request ? parseFloat(str(account.refund_request.cpu_amount)) : 0,
      remapSymbol(str(account.total_resources?.net_weight) || emptyCoin),
      remapSymbol(str(account.self_delegated_bandwidth?.net_weight) || emptyCoin),
      stakeForOthersNET
    );

    return { cpu, net };
  }, [resourceData, currentSymbol, currentWallet?.name, remapSymbol]);

  const ramMemory = React.useMemo<ResourceBase>(() => {
    if (!resourceData?.accountInfo) {
      return { core_liquid_balance: `0.0000 ${currentSymbol}`, use_percentage: 0, use_limit: { max: 0, used: 0 } };
    }
    const acc = resourceData.accountInfo;
    const ramQuota = Number(acc.ram_quota);
    const ramUsage = Number(acc.ram_usage);
    return {
      core_liquid_balance: acc.core_liquid_balance
        ? remapSymbol(String(acc.core_liquid_balance))
        : `0.0000 ${currentSymbol}`,
      use_percentage: ramQuota > 0 ? Math.floor((ramUsage / ramQuota) * 100) : 0,
      use_limit: { max: ramQuota, used: ramUsage },
    };
  }, [resourceData, currentSymbol, remapSymbol]);

  const ramprice = React.useMemo<number>(() => {
    if (!resourceData?.ramMarket) return 0;
    try {
      const row = (resourceData.ramMarket as any).rows?.[0];
      if (!row) return 0;
      const balance1 = parseFloat(row.quote.balance);
      const balance2 = parseFloat(row.base.balance);
      return (balance1 / balance2) * 1024;
    } catch {
      return 0;
    }
  }, [resourceData]);

  const handleSmoothModeChange = async (checked: boolean) => {
    setSmoothMode(checked);
    const updatedWallets = [...wallets];
    if (updatedWallets[selectedIndex]) {
      updatedWallets[selectedIndex] = { ...updatedWallets[selectedIndex], smoothMode: checked };
      await setWallets(updatedWallets);
    }
  };

  const handleRefetch = () => {
    setTimeout(() => {
      refetch();
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('resource.resources')} />

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-4 pb-3">
          {isEosMainnet && (
            <div className="flex flex-row items-stretch gap-2">
              {/* Smooth mode card */}
              <div
                className={`flex flex-col justify-center gap-2 flex-1 h-[90px] rounded-[22px] border shadow-sm ${
                  smoothMode
                    ? 'border-[#EDE9FE] bg-gradient-to-b from-primary/10 to-primary/5'
                    : 'border-[#EDE9FE] bg-white'
                }`}
                style={{ padding: '10px 14px 8px 14px' }}
              >
                <div className="flex flex-row items-center justify-between">
                  <span className="text-[15px] font-semibold text-[#3F3F46]">{t('resource.smoothMode')}</span>
                  <Switch checked={smoothMode} onCheckedChange={handleSmoothModeChange} />
                </div>
                <div className="flex flex-row items-center justify-between text-[13px] text-[#52525B]">
                  <span>
                    {t('resource.remainingNET')} {smoothModeCPU}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-0.5 text-[13px] font-bold text-[#D946EF]"
                    onClick={() => navigate('/resource/recharge')}
                  >
                    {t('resource.recharge')}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Token toggle + external link */}
              <div className="flex flex-col gap-1.5 w-[108px] h-[90px]">
                <SystemContractToggle />
                <a
                  href="https://eoseyes.com/wallet#rex"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-row items-center justify-between px-3 h-[41px] rounded-[22px] border border-[#EDE9FE] bg-white shadow-sm text-[13px] font-semibold text-[#3F3F46] hover:bg-[#F5F0FF]"
                >
                  <span>{t('resource.tradeREX')}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#52525B]" />
                </a>
              </div>
            </div>
          )}

          {/* Main content: CPU+NET left (2/3), RAM right (1/3) */}
          <div className="flex flex-row gap-2 flex-1">
            <div className="flex flex-col gap-2 flex-1 min-w-0" style={{ flex: 2 }}>
              <RowResource type="cpu" resources={resources} onRefresh={handleRefetch} />
              <RowResource type="net" resources={resources} onRefresh={handleRefetch} />
            </div>
            <div className="min-w-0" style={{ flex: 1 }}>
              <RowRam memory={ramMemory} ramprice={ramprice} onRefresh={handleRefetch} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

const SystemContractToggle: React.FC = () => {
  const { token, setToken } = useSystemContract();
  const options: SystemContractToken[] = ['EOS', 'A'];
  const activeIndex = options.indexOf(token);
  return (
    <div
      className="relative flex items-center h-[41px] rounded-[22px] border border-[#EDE9FE] bg-white shadow-sm p-0.5"
      role="tablist"
      aria-label="Token contract selector"
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[18px] bg-primary shadow-[0_1px_2px_rgba(46,16,101,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: `calc(50% - 2px)`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const active = token === opt;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setToken(opt)}
            className={`relative z-10 flex-1 h-full rounded-[18px] text-[13px] font-bold cursor-pointer transition-colors duration-300 ${
              active ? 'text-white' : 'text-[#6B7280] hover:text-[#3F3F46]'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const ResourcePageWithProvider: React.FC = () => (
  <SystemContractProvider>
    <ResourcePage />
  </SystemContractProvider>
);

export default ResourcePageWithProvider;
