import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { Balance } from '@/types/tokens';
import PageHeader from '@/components/PageHeader';
import { getChainInstance } from '@/hooks/useChainInstance';

const AddTokenPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [contract, setContract] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleAddToken = async () => {
    if (!contract.trim() || !code.trim()) {
      toast.warning(t('wallet.required') || 'Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const newContract = contract.trim().toLowerCase();
      const symbol = code.trim().toUpperCase();

      const result = await getChainInstance().getApi().getCurrencyStats(newContract, symbol);
      if (result && result.max_supply) {
        const [amount] = result.max_supply.split(' ');
        const precision = amount.includes('.') ? amount.split('.')[1].length : 0;

        const walletStore = useWalletStore.getState();
        const chainStore = useChainStore.getState();

        const coin: Balance = {
          amount: 0,
          chain: chainStore.currentChain(),
          contract: newContract,
          symbol,
          precision,
          logo: '',
        };

        const currentUserTokens = walletStore.currentUserTokens();
        const tokenExists = currentUserTokens.some(
          (x) => x.chain === coin.chain && x.contract === coin.contract && x.symbol === coin.symbol
        );

        if (tokenExists) {
          toast.error(t('wallet.addTokenExist'));
          setIsLoading(false);
          return;
        }

        await walletStore.setCurrentUserTokens([...currentUserTokens, coin]);
        toast.success(t('wallet.addTokenSuccessfully'));
        navigate(-1);
      } else {
        throw new Error('Currency not found');
      }
    } catch (_e) {
      toast.error(t('wallet.addTokenFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col px-4 pt-3.5 pb-4 gap-3.5">
      <PageHeader title={t('wallet.addMoreTokens')} />

      {/* Form Fields */}
      <div className="flex-1 flex flex-col gap-3.5 px-1">
        {/* Contract Field */}
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-[#18181B]">
            {t('wallet.contractName')}
          </span>
          <input
            className="h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] px-4 text-[14px] text-[#18181B] placeholder:text-[#A1A1AA] outline-none focus:border-[#7C3AED] transition-colors"
            placeholder={t('wallet.enterContractName') || 'Enter contract name'}
            value={contract}
            onChange={(e) => setContract(e.target.value)}
          />
        </div>

        {/* Symbol Field */}
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-[#18181B]">
            {t('wallet.symbolName')}
          </span>
          <input
            className="h-[52px] rounded-2xl bg-[#F8F5FF] border border-[#E9D8FD] px-4 text-[14px] text-[#18181B] placeholder:text-[#A1A1AA] outline-none focus:border-[#7C3AED] transition-colors"
            placeholder={t('wallet.enterTokenSymbol') || 'Enter token symbol'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-[18px]">
        <button
          onClick={handleAddToken}
          disabled={isLoading}
          className="w-full h-14 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white text-[16px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {t('wallet.submit')}
        </button>
      </div>
    </div>
  );
};

export default AddTokenPage;
