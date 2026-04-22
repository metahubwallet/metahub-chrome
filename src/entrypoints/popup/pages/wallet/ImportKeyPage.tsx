import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { sha256, encryptV3, makeKeySalt } from '@/utils/crypto';
import { isValidPrivate, privateToPublic } from '@/lib/keyring';
import { queryKeyAccountsWithFallback, getEndpoints } from '@/lib/remote';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';
import { getNetworkLocalIcon } from '@/utils/network';
import { eosChainId } from '@/utils/network';
import { Wallet } from '@/types/wallet';
import PageHeader from '@/components/PageHeader';
import ImportChoose from './components/ImportChoose';
import { Button } from '@/components/ui/button';
import { getChainInstance } from '@/hooks/useChainInstance';
import bs58 from 'bs58';

const sortAccounts = (first: Wallet, second: Wallet): number => {
  if (first.chainId === second.chainId) {
    return first.name > second.name ? 1 : -1;
  }
  if (first.chainId === eosChainId) return -1;
  if (second.chainId === eosChainId) return 1;
  return first.chainId > second.chainId ? 1 : -1;
};

const ImportKeyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const networks = useChainStore((s) => s.networks);
  const findNetwork = useChainStore((s) => s.findNetwork);

  const initialChainId = searchParams.get('chainId') || eosChainId;
  const [chainId, setChainId] = React.useState<string>(initialChainId);
  const [activeIndex, setActiveIndex] = React.useState<number>(
    networks.findIndex((item) => item.chainId === initialChainId) || 0
  );
  const [showPopover, setShowPopover] = React.useState(false);
  const [privateKey, setPrivateKey] = React.useState('');
  const [checked, setChecked] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isShowChoose, setIsShowChoose] = React.useState(false);
  const [accountList, setAccountList] = React.useState<Wallet[]>([]);

  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setChainId(networks[activeIndex]?.chainId || initialChainId);
  }, [activeIndex, networks]);

  // Close popover on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const importWallet = async (wallets: Wallet[]) => {
    setIsLoading(true);
    const walletStore = useWalletStore.getState();
    const newWallets = [...walletStore.wallets, ...wallets].sort(sortAccounts);
    await walletStore.setWallets(newWallets);

    for (const wallet of wallets) {
      await getChainInstance().fetchPermissions(wallet.name, wallet.chainId);
    }

    const firstWallet = wallets[0];
    const index = useWalletStore.getState().wallets.indexOf(firstWallet);
    await walletStore.setSelectedIndex(index >= 0 ? index : 0);

    setIsLoading(false);
    setPrivateKey('');
    navigate(-1);
    toast.success(t('wallet.importSuccess'));
  };

  const handleImportKey = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (!checked) {
      setIsLoading(false);
      toast.warning(t('public.donotAgreeProtocolsTip'));
      return;
    }

    const importAccounts: Wallet[] = [];
    let tipMessage = t('public.noAccountForPrivateKey');
    let key = privateKey;
    let isKey = isValidPrivate(key);

    if (!isKey && key.length === 64) {
      // Convert raw hex private key to WIF format
      let versionedKey = '80' + key;
      const sha256dKey = sha256(Buffer.from(versionedKey, 'hex') as any);
      const checksum = sha256(Buffer.from(sha256dKey, 'hex') as any)
        .toString()
        .substring(0, 8);
      versionedKey += checksum;
      key = bs58.encode(new Uint8Array(Buffer.from(versionedKey, 'hex')));
      isKey = true;
    }

    if (isKey) {
      const network = findNetwork(chainId);
      const seed = sha256(
        'metahub' + Math.random(),
        new Date().toString() as any
      )
        .toString()
        .substring(0, 16)
        .toUpperCase();

      const chainAccount: Wallet = {
        name: '',
        chainId: network.chainId,
        seed,
        blockchain: 'eos',
        smoothMode: false,
        keys: [],
      };

      const publicKey = privateToPublic(key);
      const userStore = useUserStore.getState();
      const salt = makeKeySalt(seed);
      const privateValue = await encryptV3(key, userStore.password, salt);
      const keyEntry = { publicKey, privateKey: privateValue, permissions: [] };
      chainAccount.keys = [keyEntry];

      try {
        const chainStore = useChainStore.getState();
        const defaultEndpoint = chainStore.selectedRpc(network.chainId) || network.endpoint || '';
        const custom = (chainStore.customRpcs[network.chainId] || []).map((r) => r.endpoint);
        let remoteEps: string[] = [];
        try {
          const eps = await getEndpoints(network.chain);
          remoteEps = (eps as Array<{ endpoint: string }>).map((r) => r.endpoint).filter(Boolean);
        } catch {
          // ignore
        }
        const accounts = await queryKeyAccountsWithFallback(publicKey, defaultEndpoint, [
          ...custom,
          ...remoteEps,
        ]);

        const walletStore = useWalletStore.getState();
        for (const account of accounts) {
          const newAccount = { ...chainAccount, name: account };
          const existed = walletStore.wallets.some(
            (w) => w.name === newAccount.name && w.chainId === newAccount.chainId
          );
          if (existed) {
            tipMessage = t('public.accountExists');
          } else {
            importAccounts.push(newAccount);
          }
        }
      } catch (e: any) {
        toast.error(String(e?.message || e));
        setIsLoading(false);
        return;
      }
    } else {
      tipMessage = t('public.invalidPrivateKey');
    }

    importAccounts.sort(sortAccounts);

    if (importAccounts.length > 1) {
      setAccountList(importAccounts);
      setIsShowChoose(true);
    } else if (importAccounts.length === 1) {
      await importWallet(importAccounts);
    } else {
      toast.error(tipMessage);
      setIsLoading(false);
    }
  };

  const handleSelectWallet = async (selectedWallets: Wallet[]) => {
    if (selectedWallets.length < 1) {
      toast.warning(t('wallet.selectOneAtLeast'));
      return;
    }
    await importWallet(selectedWallets);
  };

  const activeNetwork = networks[activeIndex];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('public.importKey')} />

      <div className="flex-1 overflow-y-auto px-4">
        {/* Network selector */}
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">{t('public.importNetTip')}:</p>
          <div className="relative" ref={popoverRef}>
            <div
              className="border border-gray-300 shadow-sm h-[71px] w-full rounded-xl flex items-center justify-between px-5 cursor-pointer"
              onClick={() => setShowPopover((v) => !v)}
            >
              <div className="flex items-center">
                {activeNetwork && (
                  <img
                    src={getNetworkLocalIcon(activeNetwork.chain)}
                    className="w-6 h-6 mr-2 rounded-full"
                    alt={activeNetwork.name}
                  />
                )}
                <span className="text-sm text-gray-800">{activeNetwork?.name}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </div>

            {showPopover && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[250px] overflow-y-auto">
                {networks.map((item, index) => (
                  <div
                    key={item.chainId}
                    className={`flex items-center py-2.5 px-3 cursor-pointer rounded-xl hover:bg-gray-100 ${
                      activeIndex === index ? 'bg-slate-200' : ''
                    }`}
                    onClick={() => {
                      setActiveIndex(index);
                      setShowPopover(false);
                    }}
                  >
                    <img
                      src={getNetworkLocalIcon(item.chain)}
                      className="w-6 h-6 mr-2 rounded-full"
                      alt={item.name}
                    />
                    <span className="text-sm text-gray-800">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Private key input */}
        <div className="mt-5">
          <p className="text-xs text-gray-600 mb-2">{t('public.importKeyTip')}:</p>
          <textarea
            className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={5}
            placeholder={t('public.importKeyTip')}
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
        </div>

        {/* Protocol checkbox */}
        <div className="flex items-center mt-2 gap-1">
          <input
            type="checkbox"
            id="protocol-check"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="cursor-pointer"
          />
          <label htmlFor="protocol-check" className="text-xs text-gray-500 cursor-pointer">
            {t('public.readAndAgree')}{' '}
            <span
              className="text-primary cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                navigate('/import-protocol');
              }}
            >
              {t('public.readAndAgreeProtocols')}
            </span>
          </label>
        </div>

      </div>

      {/* Import button - fixed bottom */}
      <div className="px-4 pt-[18px] pb-6">
        <Button
          onClick={handleImportKey}
          disabled={isLoading}
          className="w-full h-14 rounded-[28px] bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white font-bold text-base shadow-none hover:opacity-90"
        >
          {isLoading ? t('public.loading') || '...' : t('public.importKey')}
        </Button>
      </div>

      <ImportChoose
        isOpen={isShowChoose}
        accountList={accountList}
        onClose={() => {
          setIsShowChoose(false);
          setIsLoading(false);
        }}
        onImport={handleSelectWallet}
      />
    </div>
  );
};

export default ImportKeyPage;
