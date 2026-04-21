import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChainStore } from '@/stores/chainStore';
import { supportNetworks } from '@/utils/network';
import { customNetworkSchema, CustomNetworkFormData } from '@/lib/schemas/network';
import { Network } from '@/types/settings';

const NetworkAddCustomPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showTokenDiy, setShowTokenDiy] = React.useState(false);

  const networks = useChainStore((s) => s.networks);
  const customRpcs = useChainStore((s) => s.customRpcs);
  const setNetworks = useChainStore((s) => s.setNetworks);
  const setSelectedRpc = useChainStore((s) => s.setSelectedRpc);
  const setCustomRpcs = useChainStore((s) => s.setCustomRpcs);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomNetworkFormData>({
    resolver: zodResolver(customNetworkSchema),
    defaultValues: {
      tokenSymbol: 'EOS',
      tokenContract: 'eosio.token',
      tokenPrecision: 4,
    },
  });

  const addNetwork = (network: Network) => {
    setNetworks([...networks, network]);
    setSelectedRpc(network.chainId, network.endpoint);
    const updatedRpcs = {
      ...customRpcs,
      [network.chainId]: [{ name: network.name, endpoint: network.endpoint }],
    };
    setCustomRpcs(updatedRpcs);
  };

  const onSubmit = (data: CustomNetworkFormData) => {
    const existsInSupport = supportNetworks.find((n) => n.chainId === data.chainId);
    if (existsInSupport) {
      addNetwork({ ...existsInSupport });
      navigate(-1);
      return;
    }

    if (networks.find((n) => n.name === data.name)) {
      toast.error(t('setting.alreadyExistNetwork'));
      return;
    }
    if (networks.find((n) => n.chainId === data.chainId)) {
      toast.error(t('setting.alreadyExist'));
      return;
    }

    const randomInt = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
    const newNetwork: Network = {
      name: data.name,
      chain: 'ch' + randomInt,
      chainId: data.chainId,
      endpoint: data.endpoint,
      token: {
        symbol: data.tokenSymbol,
        contract: data.tokenContract || 'eosio.token',
        precision: data.tokenPrecision ?? 4,
      },
    };

    addNetwork(newNetwork);
    navigate(-1);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.addCustomNetwork')} />

      <div className="flex-1 overflow-y-auto px-4 pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-[15px] font-semibold text-[#20173C]">{t('setting.nodeName')}</Label>
            <Input
              placeholder={t('setting.nodeName')}
              {...register('name')}
              className="mt-1 rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="text-[15px] font-semibold text-[#20173C]">ChainId</Label>
            <Input
              placeholder="ChainId"
              {...register('chainId')}
              className="mt-1 rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
            />
            {errors.chainId && <p className="text-red-500 text-xs mt-1">{errors.chainId.message}</p>}
          </div>

          <div>
            <Label className="text-[15px] font-semibold text-[#20173C]">{t('setting.defaultNode')}</Label>
            <Input
              placeholder="https://"
              {...register('endpoint')}
              className="mt-1 rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
            />
            {errors.endpoint && <p className="text-red-500 text-xs mt-1">{errors.endpoint.message}</p>}
          </div>

          <div>
            <Label className="text-[15px] font-semibold text-[#20173C]">{t('setting.defaultSymbol')}</Label>
            <Input
              placeholder={t('setting.symbol')}
              {...register('tokenSymbol')}
              className="mt-1 rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
            />
            {errors.tokenSymbol && <p className="text-red-500 text-xs mt-1">{errors.tokenSymbol.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="token-diy"
              checked={showTokenDiy}
              onChange={(e) => setShowTokenDiy(e.target.checked)}
              className="cursor-pointer accent-primary"
            />
            <label htmlFor="token-diy" className="text-sm text-gray-600 cursor-pointer">
              {t('setting.defineContractNameAndPrecision')}
            </label>
          </div>

          {showTokenDiy && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder={t('setting.contractName')}
                  {...register('tokenContract')}
                  className="rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
                />
                {errors.tokenContract && (
                  <p className="text-red-500 text-xs mt-1">{errors.tokenContract.message}</p>
                )}
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder={t('setting.precision')}
                  {...register('tokenPrecision', { valueAsNumber: true })}
                  className="rounded-[18px] h-14 bg-[#F7F4FF] border-[#E3DCF7] focus:border-primary"
                />
                {errors.tokenPrecision && (
                  <p className="text-red-500 text-xs mt-1">{errors.tokenPrecision.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center mt-6">
            <Button
              type="submit"
              className="w-full h-12 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold shadow-none hover:opacity-90"
            >
              {t('password.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NetworkAddCustomPage;
